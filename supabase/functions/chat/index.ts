import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// --- Rate Limiting (in-memory, per-user, resets on cold start) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

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

// --- Quota Enforcement ---
async function checkAndIncrementQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Upsert usage counter
  const { data: existing } = await supabaseAdmin
    .from("usage_counters")
    .select("id, count")
    .eq("user_id", userId)
    .eq("counter_type", "ai_messages")
    .eq("period", period)
    .maybeSingle();

  if (existing) {
    // Free tier: 200 messages/month (can be adjusted)
    if (existing.count >= 200) {
      return { allowed: false, reason: "Monthly AI message limit reached (200). Upgrade your plan for more." };
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
  } catch (e) {
    console.error("Failed to log request:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from auth header
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
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

    // --- Quota Enforcement ---
    if (userId) {
      const quota = await checkAndIncrementQuota(supabaseAdmin, userId);
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

    // --- AI Call with Timeout ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

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
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const elapsed = Date.now() - startTime;
      if (response.status === 429) {
        await logRequest(supabaseAdmin, userId, "/chat", "POST", 429, elapsed, "AI gateway rate limit");
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await logRequest(supabaseAdmin, userId, "/chat", "POST", 402, elapsed, "AI usage limit");
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await logRequest(supabaseAdmin, userId, "/chat", "POST", response.status, elapsed, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    await logRequest(supabaseAdmin, userId, "/chat", "POST", 200, elapsed);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg.includes("aborted") ? 504 : 500;
    console.error("chat error:", e);

    // Try to log even on error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        await logRequest(supabaseAdmin, userId, "/chat", "POST", status, elapsed, errMsg);
      }
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ error: status === 504 ? "Request timed out. Please try again." : errMsg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
