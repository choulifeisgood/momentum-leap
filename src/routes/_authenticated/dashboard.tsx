import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, ListTodo, HeartPulse, RefreshCw, Brain, TrendingUp, Zap, Award, Flame, Moon, Activity } from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const userId = user!.id;
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const since7 = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const tasks = useQuery({
    queryKey: ["dash-tasks", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_date", today)
        .order("created_at");
      return data ?? [];
    },
  });

  const goals = useQuery({
    queryKey: ["dash-goals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "Completed")
        .order("priority");
      return data ?? [];
    },
  });

  const weekTasks = useQuery({
    queryKey: ["dash-week-tasks", userId, weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_tasks")
        .select("status")
        .eq("user_id", userId)
        .gte("task_date", weekStart)
        .lte("task_date", weekEnd);
      return data ?? [];
    },
  });

  const checkins = useQuery({
    queryKey: ["dash-checkins", userId, since7],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("date", since7)
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

  const badges = useQuery({
    queryKey: ["dash-badges", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const completed = weekTasks.data?.filter((t) => t.status === "Completed").length ?? 0;
  const total = weekTasks.data?.length ?? 0;
  const weekPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sleepAvg = checkins.data?.length
    ? (
        checkins.data.reduce((s, c) => s + (c.sleep_hours ?? 0), 0) / checkins.data.length
      ).toFixed(1)
    : "—";
  const deepWorkWeek = checkins.data?.reduce((s, c) => s + (c.deep_work_minutes ?? 0), 0) ?? 0;
  const energyAvg = checkins.data?.length
    ? (checkins.data.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkins.data.length).toFixed(1)
    : "—";
  const focusAvg = checkins.data?.length
    ? (checkins.data.reduce((s, c) => s + (c.focus_level ?? 0), 0) / checkins.data.length).toFixed(1)
    : "—";

  // streak
  let streak = 0;
  if (checkins.data?.length) {
    const dates = new Set(checkins.data.map((c) => c.date));
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (dates.has(d)) streak++;
      else if (i > 0) break;
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome${user?.email ? ", " + user.email.split("@")[0] : ""}.`}
        description="Your execution dashboard for the week."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Weekly progress" value={`${weekPct}%`} sub={`${completed}/${total} tasks`} />
        <Stat icon={Flame} label="Check-in streak" value={`${streak}`} sub="days in a row" />
        <Stat icon={Activity} label="Deep work" value={`${deepWorkWeek}`} sub="min this week" />
        <Stat icon={Moon} label="Avg sleep" value={`${sleepAvg}`} sub="hrs / last 7 days" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Action to="/goals" icon={Target} label="Add Weekly Goal" />
        <Action to="/tasks" icon={Plus} label="Add Today's Task" />
        <Action to="/breakdown" icon={Brain} label="Break Down a Goal" />
        <Action to="/checkin" icon={HeartPulse} label="Daily Check-In" />
        <Action to="/recovery" icon={RefreshCw} label="Recovery Mode" />
        <Action to="/progress" icon={TrendingUp} label="View Progress" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Today's top tasks</CardTitle>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/tasks"><Plus className="mr-1 h-4 w-4" /> Add</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.data && tasks.data.length > 0 ? (
              <ul className="space-y-2">
                {tasks.data.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.task_type} · {t.estimated_minutes} min · {t.difficulty}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      t.status === "Completed" ? "bg-success/15 text-success" :
                      t.status === "In progress" ? "bg-warning/15 text-warning-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>{t.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No tasks yet for today." cta={{ to: "/tasks", label: "Add a task" }} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Energy & focus (avg)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Meter label="Energy" value={Number(energyAvg) || 0} max={10} />
            <Meter label="Focus" value={Number(focusAvg) || 0} max={10} />
            <p className="text-xs text-muted-foreground">Based on your last 7 check-ins.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Weekly goals</CardTitle>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/goals"><Plus className="mr-1 h-4 w-4" /> Add</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {goals.data && goals.data.length > 0 ? (
              <ul className="space-y-2">
                {goals.data.slice(0, 5).map((g) => (
                  <li key={g.id} className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-muted-foreground">{g.category} · {g.priority}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{g.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No active weekly goals." cta={{ to: "/goals", label: "Set your first goal" }} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest badges</CardTitle>
          </CardHeader>
          <CardContent>
            {badges.data && badges.data.length > 0 ? (
              <ul className="space-y-2">
                {badges.data.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <Award className="h-4 w-4 text-primary" />
                    <div className="text-sm">{b.badge_name}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="Complete check-ins and tasks to earn badges." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Action({ to, icon: Icon, label }: { to: any; icon: any; label: string }) {
  return (
    <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
      <Link to={to}>
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value || "—"} / {max}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function EmptyState({ text, cta }: { text: string; cta?: { to: any; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <p className="mb-3 text-sm text-muted-foreground">{text}</p>
      {cta && (
        <Button size="sm" variant="outline" asChild>
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
