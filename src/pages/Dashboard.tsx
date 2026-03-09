import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Clock, BookOpen, Target, Scale, Mic, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/app/chat", icon: MessageSquare, title: "Neural Chat", desc: "Start a conversation", color: "text-primary" },
  { to: "/app/memories", icon: Clock, title: "Memories", desc: "Your timeline", color: "text-primary" },
  { to: "/app/learning", icon: BookOpen, title: "Learning", desc: "Knowledge vault", color: "text-primary" },
  { to: "/app/habits", icon: Target, title: "Habits", desc: "Track progress", color: "text-accent" },
  { to: "/app/decisions", icon: Scale, title: "Decisions", desc: "Get AI help", color: "text-primary" },
  { to: "/app/voice", icon: Mic, title: "Voice AI", desc: "Speak naturally", color: "text-accent", badge: "Beta" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          {greeting} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          What would you like to do today?
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-glow"
          >
            <div className="rounded-lg bg-muted p-2.5">
              <link.icon className={`h-5 w-5 ${link.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {link.title}
                {link.badge && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {link.badge}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
