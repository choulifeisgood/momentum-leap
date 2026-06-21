import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const since14 = format(subDays(new Date(), 13), "yyyy-MM-dd");

  const checkins = useQuery({
    queryKey: ["prog-checkins", userId, since14],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins").select("*").eq("user_id", userId)
        .gte("date", since14).order("date");
      return data ?? [];
    },
  });

  const tasks = useQuery({
    queryKey: ["prog-tasks", userId, since14],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_tasks").select("*").eq("user_id", userId)
        .gte("task_date", since14);
      return data ?? [];
    },
  });

  const goals = useQuery({
    queryKey: ["prog-goals", userId],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_goals").select("status").eq("user_id", userId);
      return data ?? [];
    },
  });

  const recoveries = useQuery({
    queryKey: ["prog-rec", userId],
    queryFn: async () => {
      const { count } = await supabase.from("recovery_plans").select("*", { count: "exact", head: true }).eq("user_id", userId);
      return count ?? 0;
    },
  });

  const badges = useQuery({
    queryKey: ["prog-badges", userId],
    queryFn: async () => {
      const { count } = await supabase.from("achievements").select("*", { count: "exact", head: true }).eq("user_id", userId);
      return count ?? 0;
    },
  });

  const sleepData = checkins.data?.map((c) => ({ date: c.date.slice(5), sleep: c.sleep_hours, focus: c.focus_level })) ?? [];
  const energyData = checkins.data?.map((c) => ({ date: c.date.slice(5), energy: c.energy_level, deep: c.deep_work_minutes })) ?? [];
  const completed = tasks.data?.filter((t) => t.status === "Completed").length ?? 0;
  const total = tasks.data?.length ?? 0;
  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
  const goalsDone = goals.data?.filter((g) => g.status === "Completed").length ?? 0;
  const avgSleep = checkins.data?.length ? (checkins.data.reduce((s, c) => s + (c.sleep_hours ?? 0), 0) / checkins.data.length).toFixed(1) : "—";
  const avgFocus = checkins.data?.length ? (checkins.data.reduce((s, c) => s + (c.focus_level ?? 0), 0) / checkins.data.length).toFixed(1) : "—";
  const avgEnergy = checkins.data?.length ? (checkins.data.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkins.data.length).toFixed(1) : "—";
  const deepTotal = checkins.data?.reduce((s, c) => s + (c.deep_work_minutes ?? 0), 0) ?? 0;

  return (
    <PageContainer>
      <PageHeader title="Progress & insights" description="Last 14 days — how your health drives your performance." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tasks completed" value={`${completed} / ${total}`} sub={`${completion}% completion`} />
        <Stat label="Goals finished" value={`${goalsDone}`} sub="across all time" />
        <Stat label="Deep work" value={`${deepTotal} min`} sub="last 14 days" />
        <Stat label="Avg sleep" value={`${avgSleep} hrs`} sub={`focus avg ${avgFocus}/10`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sleep vs Focus</CardTitle></CardHeader>
          <CardContent className="h-64">
            {sleepData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sleep" stroke="var(--chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="focus" stroke="var(--chart-2)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Energy & Deep Work</CardTitle></CardHeader>
          <CardContent className="h-64">
            {energyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="energy" fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Insight title="Sleep → Focus" body="Your focus tends to be higher on days following 7+ hours of sleep." />
        <Insight title="Exercise → Energy" body="Exercise days appear connected with higher energy scores." />
        <Insight title="Tiny first step" body="Task completion improves when you define a smaller first action." />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Weekly reflection</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">What improved this week:</span> {avgEnergy !== "—" ? `average energy at ${avgEnergy}/10.` : "keep tracking to see trends."}</p>
          <p><span className="font-medium">Stats:</span> {recoveries.data ?? 0} recovery plans used · {badges.data ?? 0} badges unlocked.</p>
          <p className="text-muted-foreground">Open recovery mode any time you fall behind — restarting is part of the system.</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </CardContent></Card>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{title}</div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </CardContent></Card>
  );
}

function Empty() {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet — complete a check-in.</div>;
}
