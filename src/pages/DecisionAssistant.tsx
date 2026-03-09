import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Scale, Plus, Loader2, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Decision {
  id: string;
  title: string;
  description: string;
  options: any;
  ai_recommendation: string | null;
  status: string;
  created_at: string;
  risk_score: number | null;
  pros: any;
  cons: any;
}

const getRiskColor = (score: number) => {
  if (score <= 3) return "text-green-400";
  if (score <= 6) return "text-yellow-400";
  return "text-red-400";
};

const getRiskLabel = (score: number) => {
  if (score <= 3) return "Low Risk";
  if (score <= 6) return "Medium Risk";
  return "High Risk";
};

const DecisionAssistant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDecisions();

    const channel = supabase
      .channel("decisions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions", filter: `user_id=eq.${user.id}` }, () => loadDecisions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadDecisions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("decisions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDecisions(data || []);
    setLoading(false);
  };

  const createDecision = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const parsedOptions = options.split("\n").filter(Boolean).map((o) => ({ text: o.trim(), pros: [], cons: [] }));

    const { error } = await supabase.from("decisions").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      options: parsedOptions,
      status: "pending",
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Decision saved" });
      setTitle(""); setDescription(""); setOptions("");
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const analyzeDecision = async (decision: Decision) => {
    setAnalyzing(decision.id);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{
            role: "user",
            content: `Analyze this decision and provide a structured risk assessment. You MUST respond in this exact JSON format (no markdown, no code fences, just raw JSON):

{
  "recommendation": "Your detailed recommendation text here using markdown formatting",
  "risk_score": <number 1-10>,
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"]
}

Decision: ${decision.title}
Context: ${decision.description}
Options: ${JSON.stringify(decision.options)}

Provide a thorough analysis with clear pros, cons, and a risk score from 1 (very safe) to 10 (very risky).`,
          }],
        },
      });
      if (error) throw error;

      const rawContent = data?.choices?.[0]?.message?.content || "";

      let parsed: any = null;
      try {
        // Try to parse JSON from the response
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback below */ }

      const recommendation = parsed?.recommendation || rawContent;
      const riskScore = parsed?.risk_score && typeof parsed.risk_score === "number" ? Math.min(10, Math.max(1, parsed.risk_score)) : null;
      const pros = Array.isArray(parsed?.pros) ? parsed.pros : [];
      const cons = Array.isArray(parsed?.cons) ? parsed.cons : [];

      await supabase
        .from("decisions")
        .update({
          ai_recommendation: recommendation,
          status: "analyzed",
          risk_score: riskScore,
          pros,
          cons,
        })
        .eq("id", decision.id);

    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) return <LoadingState message="Loading decisions..." />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Decision Assistant</h1>
          <p className="text-sm text-muted-foreground">AI-powered decision analysis & risk assessment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Decision</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Decision</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Decision Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you deciding?" className="mt-1.5" />
              </div>
              <div>
                <Label>Context</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Background and constraints..." className="mt-1.5" rows={3} />
              </div>
              <div>
                <Label>Options (one per line)</Label>
                <Textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder={"Option A\nOption B\nOption C"} className="mt-1.5" rows={4} />
              </div>
              <Button variant="hero" className="w-full" onClick={createDecision} disabled={saving || !title.trim()}>Save Decision</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {decisions.length === 0 ? (
        <EmptyState icon={Scale} title="No decisions yet" description="Add a decision and get AI-powered analysis with risk assessment." />
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{d.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()} •{" "}
                    <span className={d.status === "analyzed" ? "text-primary" : "text-accent"}>{d.status}</span>
                  </p>
                </div>
                {d.status === "pending" && (
                  <Button variant="glow" size="sm" onClick={() => analyzeDecision(d)} disabled={analyzing === d.id}>
                    {analyzing === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                  </Button>
                )}
              </div>

              {d.description && <p className="text-sm text-muted-foreground mb-3">{d.description}</p>}

              {d.options && Array.isArray(d.options) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {d.options.map((opt: any, i: number) => (
                    <span key={i} className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground">{opt.text || opt}</span>
                  ))}
                </div>
              )}

              {/* Risk Analytics Panel */}
              {d.status === "analyzed" && d.risk_score != null && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {/* Risk Score */}
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <AlertTriangle className={`h-4 w-4 ${getRiskColor(d.risk_score)}`} />
                      <span className="text-xs font-semibold text-muted-foreground">Risk Score</span>
                    </div>
                    <div className={`text-2xl font-bold ${getRiskColor(d.risk_score)}`}>{d.risk_score}/10</div>
                    <div className={`text-xs ${getRiskColor(d.risk_score)}`}>{getRiskLabel(d.risk_score)}</div>
                  </div>

                  {/* Pros */}
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-semibold text-muted-foreground">Pros</span>
                    </div>
                    <ul className="space-y-1">
                      {(Array.isArray(d.pros) ? d.pros : []).map((pro: string, i: number) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1">
                          <span className="text-green-400 shrink-0">+</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      <span className="text-xs font-semibold text-muted-foreground">Cons</span>
                    </div>
                    <ul className="space-y-1">
                      {(Array.isArray(d.cons) ? d.cons : []).map((con: string, i: number) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1">
                          <span className="text-red-400 shrink-0">−</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              {d.ai_recommendation && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> AI Recommendation
                  </p>
                  <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{d.ai_recommendation}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionAssistant;
