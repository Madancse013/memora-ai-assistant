import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

type ChatMode = "general" | "decision";

const DECISION_SYSTEM_PROMPT = "You are in Decision Mode. Help the user think through decisions systematically. For each decision, identify options, list pros and cons, assess risks (1-10), and provide a clear recommendation. Use structured markdown with headers and bullet points.";

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setConversations(data || []);
      setLoadingConvs(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!currentConvId) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", currentConvId)
        .order("created_at", { ascending: true });
      setMessages((data || []).map((m) => ({ ...m, role: m.role as "user" | "assistant" })));
    };
    load();
  }, [currentConvId]);

  const createConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select()
      .single();
    if (data) {
      setConversations((prev) => [data, ...prev]);
      setCurrentConvId(data.id);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || isLoading) return;

    let convId = currentConvId;
    if (!convId) {
      const prefix = chatMode === "decision" ? "🎯 " : "";
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: prefix + input.slice(0, 50) })
        .select()
        .single();
      if (!data) return;
      convId = data.id;
      setCurrentConvId(data.id);
      setConversations((prev) => [data, ...prev]);
    }

    const userMessage = input.trim();
    setInput("");

    const { data: savedMsg } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, user_id: user.id, role: "user", content: userMessage })
      .select()
      .single();

    if (savedMsg) {
      setMessages((prev) => [...prev, { ...savedMsg, role: savedMsg.role as "user" | "assistant" }]);
    }

    setIsLoading(true);

    try {
      const allMessages = [...messages, { role: "user" as const, content: userMessage }];
      const bodyMessages = allMessages.map((m) => ({ role: m.role, content: m.content }));

      // Prepend decision mode context if active
      if (chatMode === "decision") {
        bodyMessages.unshift({ role: "user", content: `[DECISION MODE ACTIVE] ${DECISION_SYSTEM_PROMPT}` });
      }

      const { data: aiData, error: aiError } = await supabase.functions.invoke("chat", {
        body: { messages: bodyMessages },
      });

      if (aiError) throw aiError;

      const aiContent = aiData?.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      const { data: aiMsg } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: aiContent })
        .select()
        .single();

      if (aiMsg) {
        setMessages((prev) => [...prev, { ...aiMsg, role: aiMsg.role as "user" | "assistant" }]);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to get AI response" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Sidebar */}
      <div className="hidden w-64 flex-col border-r border-border md:flex">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-semibold">Chats</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConvId(conv.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                currentConvId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="truncate block">{conv.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Mode toggle bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <button
            onClick={() => setChatMode("general")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              chatMode === "general" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            💬 General
          </button>
          <button
            onClick={() => setChatMode("decision")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              chatMode === "decision" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Scale className="h-3 w-3" /> Decision Mode
          </button>
          {chatMode === "decision" && (
            <span className="text-[10px] text-accent ml-auto">AI will provide structured decision analysis</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <EmptyState
              title={chatMode === "decision" ? "Decision Mode" : "Start a conversation"}
              description={chatMode === "decision"
                ? "Describe your decision and I'll help you analyze options, risks, and trade-offs."
                : "Send a message to begin chatting with your AI brain."}
            />
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatMode === "decision" ? "Describe your decision..." : "Type a message..."}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <Button type="submit" variant="hero" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
