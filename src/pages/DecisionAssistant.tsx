import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Scale, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
}

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
    const parsedOptions = options
      .split("\n")
      .filter(Boolean)
      .map((o) => ({ text: o.trim(), pros: [], cons: [] }));

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
      setTitle("");
      setDescription("");
      setOptions("");
      setDialogOpen(false);
      loadDecisions();
    }
    setSaving(false);
  };

  const analyzeDecision = async (decision: Decision) => {
    setAnalyzing(decision.id);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `Analyze this decision and provide a structured recommendation:\n\nDecision: ${decision.title}\nContext: ${decision.description}\nOptions: ${JSON.stringify(decision.options)}\n\nProvide:\n1. Brief analysis of each option\n2. Recommended choice\n3. Key considerations\n4. Potential risks`,
            },
          ],
        },
      });
      if (error) throw error;

      const recommendation = data?.choices?.[0]?.message?.content || "Unable to analyze.";

      await supabase
        .from("decisions")
        .update({ ai_recommendation: recommendation, status: "analyzed" })
        .eq("id", decision.id);

      loadDecisions();
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
          <p className="text-sm text-muted-foreground">AI-powered decision analysis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Decision
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Decision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Decision Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you deciding?"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Context</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Background and constraints..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <div>
                <Label>Options (one per line)</Label>
                <Textarea
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Option A&#10;Option B&#10;Option C"
                  className="mt-1.5"
                  rows={4}
                />
              </div>
              <Button variant="hero" className="w-full" onClick={createDecision} disabled={saving || !title.trim()}>
                Save Decision
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {decisions.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No decisions yet"
          description="Add a decision and get AI-powered analysis and recommendations."
        />
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{d.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()} •{" "}
                    <span className={d.status === "analyzed" ? "text-primary" : "text-accent"}>
                      {d.status}
                    </span>
                  </p>
                </div>
                {d.status === "pending" && (
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => analyzeDecision(d)}
                    disabled={analyzing === d.id}
                  >
                    {analyzing === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                )}
              </div>
              {d.description && (
                <p className="text-sm text-muted-foreground mb-3">{d.description}</p>
              )}
              {d.options && Array.isArray(d.options) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {d.options.map((opt: any, i: number) => (
                    <span
                      key={i}
                      className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {opt.text || opt}
                    </span>
                  ))}
                </div>
              )}
              {d.ai_recommendation && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-2">AI Recommendation</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{d.ai_recommendation}</p>
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
