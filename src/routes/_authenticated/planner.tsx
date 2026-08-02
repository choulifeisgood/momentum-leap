import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, CalendarRange, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateDayPlan, generateWeeklySummary, type DayPlan, type WeeklySummary } from "@/lib/planner.functions";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "AI Strategist — Alpha Momentum" },
      { name: "description", content: "AI day planning and weekly execution review built on your real capacity data." },
      { property: "og:title", content: "AI Strategist — Alpha Momentum" },
      { property: "og:description", content: "Sequence today's work and review the week that actually happened." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const planFn = useServerFn(generateDayPlan);
  const weekFn = useServerFn(generateWeeklySummary);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [week, setWeek] = useState<WeeklySummary | null>(null);

  const planM = useMutation({
    mutationFn: async () => (await planFn({ data: {} })) as DayPlan,
    onSuccess: setPlan,
    onError: (e: any) => toast.error(e.message),
  });

  const weekM = useMutation({
    mutationFn: async () => (await weekFn({ data: {} })) as WeeklySummary,
    onSuccess: setWeek,
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="AI Strategist"
        description="Sequences today against your real capacity, then tells you the truth about your week."
      />

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day"><Brain className="mr-2 h-4 w-4" />Day plan</TabsTrigger>
          <TabsTrigger value="week"><CalendarRange className="mr-2 h-4 w-4" />Weekly summary</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6 space-y-4">
          <Button onClick={() => planM.mutate()} disabled={planM.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {planM.isPending ? "Building your plan…" : "Build today's plan"}
          </Button>

          {plan && (
            <div className="space-y-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <p className="text-base font-semibold">{plan.headline}</p>
                  {plan.capacity_read && <p className="mt-1 text-sm text-muted-foreground">{plan.capacity_read}</p>}
                </CardContent>
              </Card>

              {plan.blocks.length > 0 && (
                <Card><CardContent className="space-y-3 p-6">
                  {plan.blocks.map((b, i) => (
                    <div key={i} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
                      <div className="w-28 shrink-0 text-sm font-mono text-primary">{b.time}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.task} <span className="text-xs text-muted-foreground">· {b.minutes} min</span></p>
                        <p className="text-xs text-muted-foreground">{b.why}</p>
                      </div>
                    </div>
                  ))}
                </CardContent></Card>
              )}

              {plan.cut_list.length > 0 && (
                <Card><CardContent className="p-6">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cut today</div>
                  <ul className="list-inside list-disc space-y-1 text-sm">{plan.cut_list.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </CardContent></Card>
              )}

              {plan.risk && (
                <Card className="border-destructive/30"><CardContent className="p-6 text-sm">
                  <span className="font-semibold">Main risk: </span>{plan.risk}
                </CardContent></Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-6 space-y-4">
          <Button onClick={() => weekM.mutate()} disabled={weekM.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {weekM.isPending ? "Reviewing your week…" : "Generate weekly summary"}
          </Button>

          {week && (
            <div className="space-y-4">
              <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
                <p className="text-base font-semibold">{week.headline}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {week.stats.tasks_completed}/{week.stats.tasks_planned} tasks completed · {week.stats.checkins} check-ins
                  {week.stats.avg_energy !== null && ` · avg energy ${week.stats.avg_energy}/10`}
                </p>
              </CardContent></Card>

              {([
                ["Wins", week.wins],
                ["Drift", week.drift],
                ["Patterns", week.patterns],
                ["Focus next week", week.next_week_focus],
              ] as const).map(([label, items]) =>
                items.length > 0 ? (
                  <Card key={label}><CardContent className="p-6">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                    <ul className="list-inside list-disc space-y-1 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </CardContent></Card>
                ) : null,
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
