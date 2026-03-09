import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  BookOpen,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/app/chat", icon: MessageSquare, label: "Chat" },
  { to: "/app/memories", icon: Clock, label: "Memory" },
  { to: "/app/learning", icon: BookOpen, label: "Learn" },
  { to: "/app/habits", icon: Target, label: "Habits" },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md py-2 md:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
