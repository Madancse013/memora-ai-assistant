import { Brain, MessageSquare, Clock, BookOpen, Target, Scale, Mic, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MessageSquare, title: "Neural Chat", desc: "AI conversations with persistent memory" },
  { icon: Clock, title: "Memory Timeline", desc: "Timestamped memories, always retrievable" },
  { icon: BookOpen, title: "Learning Vault", desc: "Store and organize your knowledge" },
  { icon: Target, title: "Habit Loop", desc: "Track habits with streaks and insights" },
  { icon: Scale, title: "Decision Assistant", desc: "AI-powered decision analysis" },
  { icon: Mic, title: "Voice AI", desc: "Speak your thoughts naturally", badge: "Beta" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Memora</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button variant="hero" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-32 pb-20 text-center">
        <div className="mx-auto max-w-3xl slide-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Your Personal AI Brain
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Remember Everything.{" "}
            <span className="gradient-text">Learn Faster.</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            Memora is your AI-powered second brain — chat with persistent memory, track habits, make better decisions, and never lose a thought again.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/auth?tab=signup">
              <Button variant="hero" size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-glow"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground flex items-center gap-2">
                {f.title}
                {f.badge && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {f.badge}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="container pb-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">End-to-end privacy</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Sub-second AI responses</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Learns from your usage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 Memora. Your personal AI brain.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
