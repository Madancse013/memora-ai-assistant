import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Plus, Check, Flame } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Habit {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  created_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  logged_at: string;
}

const HabitLoop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [{ data: habitsData }, { data: logsData }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);
    setHabits(habitsData || []);
    setLogs(logsData || []);
    setLoading(false);
  };

  const createHabit = async () => {
    if (!user || !habitName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name: habitName.trim(),
      frequency,
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Habit created" });
      setHabitName("");
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const logHabit = async (habitId: string) => {
    if (!user) return;
    const alreadyLogged = logs.some(
      (l) => l.habit_id === habitId && l.logged_at.startsWith(today)
    );
    if (alreadyLogged) return;

    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: user.id,
      logged_at: new Date().toISOString(),
    });
    if (!error) {
      // Update streak
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        await supabase
          .from("habits")
          .update({ streak: (habit.streak || 0) + 1 })
          .eq("id", habitId);
      }
      loadData();
    }
  };

  const isLoggedToday = (habitId: string) =>
    logs.some((l) => l.habit_id === habitId && l.logged_at.startsWith(today));

  const getCompletionRate = (habitId: string) => {
    const habitLogs = logs.filter((l) => l.habit_id === habitId);
    return Math.min(100, Math.round((habitLogs.length / 30) * 100));
  };

  if (loading) return <LoadingState message="Loading habits..." />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Habit Loop</h1>
          <p className="text-sm text-muted-foreground">Build consistency, track streaks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Habit Name</Label>
                <Input
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g., Morning meditation"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="hero" className="w-full" onClick={createHabit} disabled={saving || !habitName.trim()}>
                Create Habit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No habits yet"
          description="Start building habits to track your daily consistency."
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const done = isLoggedToday(habit.id);
            const rate = getCompletionRate(habit.id);
            return (
              <div
                key={habit.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <button
                  onClick={() => logHabit(habit.id)}
                  disabled={done}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    done
                      ? "border-primary bg-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {done && <Check className="h-5 w-5 text-primary-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{habit.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{habit.frequency}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-accent">
                    <Flame className="h-4 w-4" />
                    <span className="font-bold">{habit.streak || 0}</span>
                  </div>
                  <div className="hidden sm:block">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{rate}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HabitLoop;
