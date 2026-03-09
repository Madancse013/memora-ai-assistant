import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Search, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["personal", "work", "learning", "decision", "habit"];

interface Memory {
  id: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
}

const Memories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("personal");
  const [newTags, setNewTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadMemories();

    // Realtime subscription
    const channel = supabase
      .channel("memories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memories", filter: `user_id=eq.${user.id}` },
        () => { loadMemories(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadMemories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMemories(data || []);
    setLoading(false);
  };

  const saveMemory = async () => {
    if (!user || !newContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("memories").insert({
      user_id: user.id,
      content: newContent.trim(),
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Memory saved" });
      setNewContent("");
      setNewTags("");
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const filtered = memories.filter((m) => {
    const matchSearch = !search || m.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || m.category === filterCategory;
    return matchSearch && matchCategory;
  });

  if (loading) return <LoadingState message="Loading memories..." />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memory Timeline</h1>
          <p className="text-sm text-muted-foreground">Your personal memory bank</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Memory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Content</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="What do you want to remember?"
                  className="mt-1.5"
                  rows={4}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="tag1, tag2" className="mt-1.5" />
              </div>
              <Button variant="hero" className="w-full" onClick={saveMemory} disabled={saving || !newContent.trim()}>
                Save Memory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="No memories yet" description="Start saving memories to build your personal timeline." />
      ) : (
        <div className="relative space-y-4">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border hidden md:block" />
          {filtered.map((memory) => (
            <div key={memory.id} className="relative md:pl-10">
              <div className="absolute left-2.5 top-4 h-3 w-3 rounded-full bg-primary hidden md:block" />
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{memory.category}</span>
                  <span className="text-xs text-muted-foreground">{new Date(memory.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-foreground">{memory.content}</p>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memory.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Memories;
