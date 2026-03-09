import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const VoiceAI = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        variant: "destructive",
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      toast({ variant: "destructive", title: "Error", description: "Speech recognition failed." });
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const sendTranscript = async () => {
    if (!transcript.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{ role: "user", content: transcript }],
        },
      });
      if (error) throw error;
      const aiResponse = data?.choices?.[0]?.message?.content || "No response.";
      setResponse(aiResponse);

      // Optional TTS
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Voice AI
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent">
            Beta
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">Speak your thoughts, get AI responses</p>
      </div>

      {/* Voice button */}
      <div className="flex flex-col items-center py-12">
        <button
          onClick={isRecording ? undefined : startRecording}
          className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all ${
            isRecording
              ? "border-destructive bg-destructive/10 animate-pulse"
              : "border-primary bg-primary/10 hover:bg-primary/20"
          }`}
        >
          {isRecording ? (
            <MicOff className="h-10 w-10 text-destructive" />
          ) : (
            <Mic className="h-10 w-10 text-primary" />
          )}
        </button>
        <p className="text-sm text-muted-foreground">
          {isRecording ? "Listening..." : "Tap to speak"}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Your words</p>
          <p className="text-sm text-foreground">{transcript}</p>
          <Button
            variant="hero"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={sendTranscript}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to AI
          </Button>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary mb-1">AI Response</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceAI;
