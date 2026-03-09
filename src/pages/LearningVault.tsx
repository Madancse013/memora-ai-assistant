import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, Plus, FileText, Upload, Paperclip, X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LearningFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
}

interface LearningItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  item_type: string;
  created_at: string;
  files?: LearningFile[];
}

const LearningVault = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadItems();

    // Realtime subscription
    const channel = supabase
      .channel("learning-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "learning_items", filter: `user_id=eq.${user.id}` },
        () => { loadItems(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    const { data: itemsData } = await supabase
      .from("learning_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!itemsData) { setItems([]); setLoading(false); return; }

    const itemIds = itemsData.map((i) => i.id);
    const { data: filesData } = await supabase
      .from("learning_files")
      .select("*")
      .in("learning_item_id", itemIds);

    const itemsWithFiles: LearningItem[] = itemsData.map((item) => ({
      ...item,
      files: (filesData || []).filter((f) => f.learning_item_id === item.id),
    }));

    setItems(itemsWithFiles);
    setLoading(false);
  };

  const uploadFile = async (file: File, itemId: string): Promise<LearningFile | null> => {
    if (!user) return null;
    const filePath = `${user.id}/${itemId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("learning-files")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) { console.error("Upload error:", uploadError); return null; }

    const { data: fileRecord, error: dbError } = await supabase
      .from("learning_files")
      .insert({
        learning_item_id: itemId,
        user_id: user.id,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type || null,
      })
      .select()
      .single();

    if (dbError) { console.error("DB error:", dbError); return null; }
    return fileRecord;
  };

  const saveItem = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    const { data: newItem, error } = await supabase
      .from("learning_items")
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || "general",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        item_type: pendingFiles.length > 0 ? "note+files" : "note",
      })
      .select()
      .single();

    if (error || !newItem) {
      const isDuplicate = error?.message?.includes("idx_learning_items_no_dup") || error?.code === "23505";
      toast({
        variant: "destructive",
        title: isDuplicate ? "Duplicate Entry" : "Error",
        description: isDuplicate ? "A note with this title and category already exists." : (error?.message || "Failed to save"),
      });
      setSaving(false);
      return;
    }

    let uploadFailed = false;
    for (const file of pendingFiles) {
      const result = await uploadFile(file, newItem.id);
      if (!result) uploadFailed = true;
    }

    if (uploadFailed) {
      toast({ title: "Saved with warnings", description: "Some files failed to upload." });
    } else {
      toast({ title: "Saved to vault" });
    }

    setTitle(""); setContent(""); setCategory(""); setTags("");
    setPendingFiles([]); setDialogOpen(false); setSaving(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 20 * 1024 * 1024;
    const valid = files.filter((f) => {
      if (f.size > maxSize) {
        toast({ variant: "destructive", title: "File too large", description: `${f.name} exceeds 20MB limit.` });
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  const downloadFile = async (file: LearningFile) => {
    const { data, error } = await supabase.storage.from("learning-files").download(file.file_url);
    if (error || !data) { toast({ variant: "destructive", title: "Error", description: "Failed to download file." }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = file.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (file: File) => {
    if (file.size < 1024) return `${file.size} B`;
    if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = items.filter(
    (i) => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading vault..." />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Learning Vault</h1>
          <p className="text-sm text-muted-foreground">Your knowledge repository</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setPendingFiles([]); }}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Note</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Learning Note</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What did you learn?" className="mt-1.5" />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Details, notes, summaries..." className="mt-1.5" rows={5} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., programming, science" className="mt-1.5" />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, typescript" className="mt-1.5" />
              </div>
              <div>
                <Label>Attachments</Label>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                  <Upload className="h-5 w-5" /><span>Click to attach files (max 20MB each)</span>
                </button>
                {pendingFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 text-foreground">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file)}</span>
                        <button onClick={() => removePendingFile(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="hero" className="w-full" onClick={saveItem} disabled={saving || !title.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to Vault
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vault..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Vault is empty" description="Start saving notes, summaries, and learnings." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category} • {new Date(item.created_at).toLocaleDateString()}</p>
                  {item.content && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{item.content}</p>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (<span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>))}
                    </div>
                  )}
                  {item.files && item.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.files.map((file) => (
                        <button key={file.id} onClick={() => downloadFile(file)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Download className="h-3 w-3" />{file.file_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningVault;
