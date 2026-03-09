import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Constants ---
const MAX_MESSAGE_LENGTH = 10_000; // chars per message
const MAX_MESSAGES = 50; // max messages in conversation context
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const AI_TIMEOUT_MS = 30_000;
const MONTHLY_MSG_LIMIT_FREE = 200;

// --- Prompt Injection Filter ---
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if\s+you/i,
  /override\s+(your\s+)?system/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /new\s+instructions:/i,
  /\[system\]/i,
  /\<\|im_start\|\>/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// --- Rate Limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --- Sanitize error for client ---
function sanitizeError(msg: string): string {
  // Strip internal details, paths, stack traces
  if (msg.includes("LOVABLE_API_KEY")) return "AI service configuration error.";
  if (msg.includes("SUPABASE")) return "Backend configuration error.";
  if (msg.length > 200) return "An internal error occurred.";
  return msg;
}

// --- Quota Check ---
async function checkAndIncrementQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  plan: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limit = plan === "free" ? MONTHLY_MSG_LIMIT_FREE : 2000;
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("usage_counters")
    .select("id, count")
    .eq("user_id", userId)
    .eq("counter_type", "ai_messages")
    .eq("period", period)
    .maybeSingle();

  if (existing) {
    if (existing.count >= limit) {
      return { allowed: false, reason: `Monthly AI message limit reached (${limit}). Upgrade your plan for more.` };
    }
    await supabaseAdmin
      .from("usage_counters")
      .update({ count: existing.count + 1, updated_at: now.toISOString() })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("usage_counters").insert({
      user_id: userId,
      counter_type: "ai_messages",
      period,
      period_start: periodStart,
      count: 1,
    });
  }
  return { allowed: true };
}

// --- Token Tracking ---
async function trackTokenUsage(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  tokens: number
) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("usage_counters")
    .select("id, token_count")
    .eq("user_id", userId)
    .eq("counter_type", "ai_tokens")
    .eq("period", period)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("usage_counters")
      .update({ token_count: (existing.token_count || 0) + tokens, count: (existing.token_count || 0) + tokens, updated_at: now.toISOString() })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("usage_counters").insert({
      user_id: userId,
      counter_type: "ai_tokens",
      period,
      period_start: periodStart,
      count: tokens,
      token_count: tokens,
    });
  }
}

// --- Structured Logging ---
async function logRequest(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  error?: string
) {
  try {
    await supabaseAdmin.from("api_logs").insert({
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      error: error || null,
    });
  } catch (_) { /* ignore logging errors */ }
}

// --- Input Validation ---
function validateMessages(messages: any): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) return { valid: false, error: "Messages must be an array." };
  if (messages.length === 0) return { valid: false, error: "Messages cannot be empty." };
  if (messages.length > MAX_MESSAGES) return { valid: false, error: `Too many messages (max ${MAX_MESSAGES}).` };

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") return { valid: false, error: "Invalid message format." };
    if (!["user", "assistant", "system"].includes(msg.role)) return { valid: false, error: "Invalid message role." };
    if (typeof msg.content !== "string") return { valid: false, error: "Message content must be a string." };
    if (msg.content.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars).` };
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // --- Request size limit (1MB) ---
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1_000_000) {
      return new Response(JSON.stringify({ error: "Request too large (max 1MB)." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, stream } = body;

    // --- Input validation ---
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Extract user ---
    const authHeader = req.headers.get("authorization");
    let userPlan = "free";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;

      // Check subscription plan
      if (userId) {
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();
        userPlan = sub?.plan || "free";
      }
    }

    // --- Rate Limiting ---
    if (userId && isRateLimited(userId)) {
      const elapsed = Date.now() - startTime;
      await logRequest(supabaseAdmin, userId, "/chat", "POST", 429, elapsed, "Rate limited");
      return new Response(JSON.stringify({ error: "Rate limit exceeded (60/min). Please slow down." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Quota Enforcement (plan-aware) ---
    if (userId) {
      const quota = await checkAndIncrementQuota(supabaseAdmin, userId, userPlan);
      if (!quota.allowed) {
        const elapsed = Date.now() - startTime;
        await logRequest(supabaseAdmin, userId, "/chat", "POST", 402, elapsed, quota.reason);
        return new Response(JSON.stringify({ error: quota.reason }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Prompt Injection Filter ---
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && containsInjection(lastUserMsg.content)) {
      const elapsed = Date.now() - startTime;
      await logRequest(supabaseAdmin, userId, "/chat", "POST", 400, elapsed, "Prompt injection detected");
      return new Response(JSON.stringify({ error: "Your message was blocked by our safety filter. Please rephrase." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AI Call ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const useStream = stream === true;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are Memora, a personal AI brain assistant. You help users remember things, learn, make decisions, and build habits. Be concise, helpful, and thoughtful. Use markdown formatting when helpful.",
          },
          ...messages,
        ],
        stream: useStream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const elapsed = Date.now() - startTime;
      if (response.status === 429) {
        await logRequest(supabaseAdmin, userId, "/chat", "POST", 429, elapsed, "AI gateway rate limit");
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await logRequest(supabaseAdmin, userId, "/chat", "POST", 402, elapsed, "AI usage limit");
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please upgrade your plan." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await logRequest(supabaseAdmin, userId, "/chat", "POST", response.status, elapsed, t.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Streaming response ---
    if (useStream) {
      const elapsed = Date.now() - startTime;
      await logRequest(supabaseAdmin, userId, "/chat", "POST", 200, elapsed);
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // --- Non-streaming response ---
    const data = await response.json();
    const elapsed = Date.now() - startTime;

    // Track token usage
    const totalTokens = data?.usage?.total_tokens;
    if (userId && totalTokens) {
      await trackTokenUsage(supabaseAdmin, userId, totalTokens);
    }

    await logRequest(supabaseAdmin, userId, "/chat", "POST", 200, elapsed);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg.includes("aborted") ? 504 : 500;
    console.error("chat error:", e);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const admin = createClient(supabaseUrl, supabaseServiceKey);
        await logRequest(admin, userId, "/chat", "POST", status, elapsed, errMsg.slice(0, 500));
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      error: status === 504
        ? "Request timed out. Please try again."
        : sanitizeError(errMsg),
    }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
