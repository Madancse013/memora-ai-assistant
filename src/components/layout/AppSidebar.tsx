import { NavLink, useLocation } from "react-router-dom";
import {
  Brain,
  MessageSquare,
  Clock,
  BookOpen,
  Target,
  Scale,
  Mic,
  Settings,
  CreditCard,
  LayoutDashboard,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/chat", icon: MessageSquare, label: "Neural Chat" },
  { to: "/app/memories", icon: Clock, label: "Memory Timeline" },
  { to: "/app/learning", icon: BookOpen, label: "Learning Vault" },
  { to: "/app/habits", icon: Target, label: "Habit Loop" },
  { to: "/app/decisions", icon: Scale, label: "Decision Assistant" },
  { to: "/app/voice", icon: Mic, label: "Voice AI", badge: "Beta" },
];

const bottomItems = [
  { to: "/app/settings", icon: Settings, label: "Settings" },
  { to: "/app/billing", icon: CreditCard, label: "Billing" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-sidebar transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-foreground">Memora</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-border px-3 py-3 space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
