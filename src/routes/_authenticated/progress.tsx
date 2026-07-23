import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [
    { title: "Telemetry — Alpha Momentum" },
    { name: "description", content: "Execution telemetry: sleep, energy, focus, capacity, completion." },
    { property: "og:title", content: "Telemetry — Alpha Momentum" },
    { property: "og:description", content: "Trend lines on the inputs that drive your output." },
  ] }),
  component: TelemetryPage,
});

function TelemetryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const since14 = format(subDays(new Date(), 13), "yyyy-MM-dd");

  const checkins = useQuery({
    queryKey: ["prog-checkins", userId, since14],
    queryFn: async () => {
      const { data } = await supabase.from("checkins").select("*").eq("user_id", userId)
        .gte("date", since14).order("date");
      return data ?? [];
    },
  });

  const tasks = useQuery({
    queryKey: ["prog-tasks", userId, since14],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("status,task_date").eq("user_id", userId)
        .is("deleted_at", null).gte("task_date", since14);
      return data ?? [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["prog-outcomes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("outcomes").select("status").eq("user_id", userId).is("deleted_at", null);
      return data ?? [];
    },
  });

  const sleepData = checkins.data?.map((c: any) => ({ date: c.date.slice(5), sleep: c.sleep_hours, energy: c.energy })) ?? [];
  const capacityData = checkins.data?.map((c: any) => ({ date: c.date.slice(5), capacity: c.available_capacity, stress: c.stress })) ?? [];
  const completed = tasks.data?.filter((t: any) => t.status === "done").length ?? 0;
  const total = tasks.data?.length ?? 0;
  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
  const outcomesDone = outcomes.data?.filter((g: any) => g.status === "done").length ?? 0;
  const avgSleep = checkins.data?.length ? (checkins.data.reduce((s: number, c: any) => s + (c.sleep_hours ?? 0), 0) / checkins.data.length).toFixed(1) : "—";
  const avgEnergy = checkins.data?.length ? (checkins.data.reduce((s: number, c: any) => s + (c.energy ?? 0), 0) / checkins.data.length).toFixed(1) : "—";
  const avgCap = checkins.data?.length ? Math.round(checkins.data.reduce((s: number, c: any) => s + (c.available_capacity ?? 0), 0) / checkins.data.length) : 0;

  return (
    <PageContainer>
      <PageHeader title="Telemetry" description="Last 14 days — the inputs driving your output." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Task completion" value={`${completion}%`} sub={`${completed} / ${total} done`} />
        <Stat label="Outcomes shipped" value={`${outcomesDone}`} sub="all time" />
        <Stat label="Avg capacity" value={`${avgCap}%`} sub="last 14 days" />
        <Stat label="Avg sleep" value={`${avgSleep} hrs`} sub={`energy ${avgEnergy}/10`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sleep vs Energy</CardTitle></CardHeader>
          <CardContent className="h-64">
            {sleepData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sleep" stroke="var(--chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="energy" stroke="var(--chart-2)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Capacity vs Stress</CardTitle></CardHeader>
          <CardContent className="h-64">
            {capacityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="capacity" fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>
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

function Empty() {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet — complete a check-in.</div>;
}
