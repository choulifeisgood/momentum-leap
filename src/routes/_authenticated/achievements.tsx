import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [
    { title: "Milestones — Alpha Momentum" },
    { name: "description", content: "Professional milestones. Not gamification — evidence of who you're becoming." },
    { property: "og:title", content: "Milestones — Alpha Momentum" },
    { property: "og:description", content: "Track the identity behind the execution." },
  ] }),
  component: MilestonesPage,
});

const ALL: { name: string; description: string; category: string }[] = [
  { name: "Clarified Intent", description: "Set an outcome with a clear 'why it matters'.", category: "clarity" },
  { name: "Shipped an Outcome", description: "Closed out a strategic outcome.", category: "execution" },
  { name: "Obstacle Planned", description: "Wrote an if-then with a real backup plan.", category: "planning" },
  { name: "Sleep Protected", description: "Logged 7.5+ hours of sleep.", category: "health" },
  { name: "Contained the Shock", description: "Used recovery mode to restart cleanly.", category: "resilience" },
];

function MilestonesPage() {
  const { user } = useAuth();
  const userId = user!.id;

  const unlocked = useQuery({
    queryKey: ["milestones", userId],
    queryFn: async () => {
      const { data } = await supabase.from("milestones").select("name").eq("user_id", userId);
      return new Set((data ?? []).map((b: any) => b.name));
    },
  });

  const set = unlocked.data ?? new Set<string>();

  return (
    <PageContainer>
      <PageHeader
        title="Milestones"
        description="Evidence of who you're becoming as an operator."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL.map((b) => {
          const got = set.has(b.name);
          return (
            <Card key={b.name} className={cn(!got && "opacity-60")}>
              <CardContent className="p-5">
                <div className={cn(
                  "mb-3 grid h-10 w-10 place-items-center rounded-lg",
                  got ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {got ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                <div className="mt-3 text-xs font-medium uppercase tracking-wider">
                  {got ? <span className="text-success">Unlocked</span> : <span className="text-muted-foreground">Locked</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
