import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, HeartPulse, RefreshCw, Brain, TrendingUp, Award, Zap, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Command Center — Alpha Momentum" },
    { name: "description", content: "Decision-first execution dashboard: top outcomes, next best action, capacity, and shocks." },
    { property: "og:title", content: "Command Center — Alpha Momentum" },
    { property: "og:description", content: "The one screen that tells you what to do next." },
  ] }),
  component: CommandCenter,
});

function CommandCenter() {
  const { user } = useAuth();
  const userId = user!.id;
  const today = format(new Date(), "yyyy-MM-dd");
  const since7 = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const tasks = useQuery({
    queryKey: ["dash-tasks", userId, today],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*")
        .eq("user_id", userId).eq("task_date", today).is("deleted_at", null)
        .order("created_at");
      return data ?? [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["dash-goals", userId],
    queryFn: async () => {
      const { data } = await supabase.from("outcomes").select("*")
        .eq("user_id", userId).is("deleted_at", null).eq("status", "active")
        .order("priority");
      return data ?? [];
    },
  });

  const checkins = useQuery({
    queryKey: ["dash-checkins", userId, since7],
    queryFn: async () => {
      const { data } = await supabase.from("checkins").select("*")
        .eq("user_id", userId).gte("date", since7).order("date", { ascending: false });
      return data ?? [];
    },
  });

  const latestCheckin = checkins.data?.[0];
  const todayCheckin = latestCheckin?.date === today ? latestCheckin : null;
  const capacity = todayCheckin?.available_capacity ?? null;
  const plannedMinutes = tasks.data?.reduce((s: number, t: any) => s + (t.estimated_minutes ?? 0), 0) ?? 0;
  const capacityMinutes = capacity != null ? Math.round((capacity / 100) * 8 * 60) : null;
  const overloaded = capacityMinutes != null && plannedMinutes > capacityMinutes * 1.1;

  const critical = outcomes.data?.filter((o: any) => o.priority === "critical") ?? [];
  const top3 = (outcomes.data ?? []).slice(0, 3);
  const nextTask = tasks.data?.find((t: any) => t.status === "pending" || t.status === "in_progress");

  return (
    <PageContainer>
      <PageHeader
        title="Command Center"
        description={`${format(new Date(), "EEEE, MMM d")} — what to do next.`}
      />

      {/* Decision row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="border-primary/40 bg-primary/5 lg:col-span-2">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-primary">Next best action</CardTitle></CardHeader>
          <CardContent>
            {nextTask ? (
              <>
                <div className="text-2xl font-semibold">{nextTask.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {nextTask.task_type} · {nextTask.estimated_minutes} min · {nextTask.energy_required} energy
                </div>
                <Button className="mt-4" asChild><Link to="/tasks">Open today's plan</Link></Button>
              </>
            ) : (
              <>
                <div className="text-lg text-muted-foreground">No task queued. Plan one now.</div>
                <Button className="mt-4" asChild><Link to="/tasks"><Plus className="mr-1 h-4 w-4" /> Plan a task</Link></Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Capacity today</CardTitle></CardHeader>
          <CardContent>
            {todayCheckin ? (
              <>
                <div className="text-3xl font-semibold">{capacity}%</div>
                <div className="mt-1 text-xs text-muted-foreground">Sleep {todayCheckin.sleep_hours}h · energy {todayCheckin.energy}/10</div>
                <Progress className="mt-3" value={capacity ?? 0} />
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">No check-in yet today.</div>
                <Button className="mt-3" size="sm" asChild><Link to="/checkin"><HeartPulse className="mr-1 h-4 w-4" /> 60-sec check-in</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {overloaded && (
        <Card className="mb-6 border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            <div>
              <div className="font-medium">Overload warning</div>
              <div className="text-sm text-muted-foreground">
                Planned {Math.round(plannedMinutes / 60)}h vs ~{Math.round(capacityMinutes! / 60)}h of realistic capacity. Consider deferring one block.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Action to="/goals" icon={Target} label="New Outcome" />
        <Action to="/tasks" icon={Plus} label="Plan Task" />
        <Action to="/breakdown" icon={Brain} label="AI Breakdown" />
        <Action to="/intentions" icon={Zap} label="If-Then" />
        <Action to="/recovery" icon={RefreshCw} label="Recovery" />
        <Action to="/progress" icon={TrendingUp} label="Telemetry" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Top outcomes</CardTitle>
            <Button size="sm" variant="ghost" asChild><Link to="/goals"><Plus className="mr-1 h-4 w-4" /> New</Link></Button>
          </CardHeader>
          <CardContent>
            {top3.length > 0 ? (
              <ul className="space-y-2">
                {top3.map((g: any) => (
                  <li key={g.id} className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.priority}{g.deadline ? ` · by ${g.deadline}` : ""}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No active outcomes." cta={{ to: "/goals", label: "Define your first outcome" }} />
            )}
            {critical.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                {critical.length} critical outcome{critical.length > 1 ? "s" : ""} in flight.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent shocks</CardTitle></CardHeader>
          <CardContent>
            {checkins.data && checkins.data.some((c: any) => c.unexpected_event) ? (
              <ul className="space-y-2 text-sm">
                {checkins.data.filter((c: any) => c.unexpected_event).slice(0, 3).map((c: any) => (
                  <li key={c.id} className="rounded border border-border bg-background p-2">
                    <div className="text-xs text-muted-foreground">{c.date}</div>
                    <div>{c.unexpected_event}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing unexpected logged this week.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
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

function EmptyState({ text, cta }: { text: string; cta?: { to: any; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <p className="mb-3 text-sm text-muted-foreground">{text}</p>
      {cta && <Button size="sm" variant="outline" asChild><Link to={cta.to}>{cta.label}</Link></Button>}
    </div>
  );
}
