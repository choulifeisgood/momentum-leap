import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Achievements" }] }),
  component: AchievementsPage,
});

const ALL_BADGES = [
  { name: "3-Day Streak", desc: "Three consecutive daily check-ins." },
  { name: "Recovery Win", desc: "Used recovery mode to restart without guilt." },
  { name: "Deep Work Starter", desc: "Logged 90+ minutes of deep work in a day." },
  { name: "Sleep Protected", desc: "Slept 7.5+ hours and tracked it." },
  { name: "Weekly Finisher", desc: "Completed a weekly goal." },
  { name: "Obstacle Solver", desc: "Created an if-then plan with a backup." },
  { name: "Healthy Routine Builder", desc: "Exercised and ate well on the same day." },
  { name: "Future Self Builder", desc: "Set a goal with a clear 'why it matters'." },
];

function AchievementsPage() {
  const { user } = useAuth();
  const userId = user!.id;

  const unlocked = useQuery({
    queryKey: ["all-badges", userId],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").eq("user_id", userId);
      return new Set((data ?? []).map((b) => b.badge_name));
    },
  });

  const set = unlocked.data ?? new Set<string>();

  return (
    <PageContainer>
      <PageHeader
        title="Achievements"
        description="Identity-based reinforcement. You're becoming someone who follows through."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_BADGES.map((b) => {
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
                <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
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
