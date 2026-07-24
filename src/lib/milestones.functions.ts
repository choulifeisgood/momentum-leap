import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type M = { name: string; description: string; category: string };

export const MILESTONE_CATALOG: M[] = [
  { name: "Clarified Intent", description: "Set an outcome with a clear 'why it matters'.", category: "clarity" },
  { name: "Shipped an Outcome", description: "Closed out a strategic outcome.", category: "execution" },
  { name: "Obstacle Planned", description: "Wrote an if-then with a real backup plan.", category: "planning" },
  { name: "Sleep Protected", description: "Logged 7.5+ hours of sleep.", category: "health" },
  { name: "Contained the Shock", description: "Used recovery mode to restart cleanly.", category: "resilience" },
  { name: "Consistent Executor", description: "Completed 10+ tasks across the last 14 days.", category: "execution" },
  { name: "Deep Focus", description: "Completed 5+ deep-work tasks.", category: "focus" },
  { name: "Weekly Reviewer", description: "Logged check-ins on 5+ days in the last week.", category: "reflection" },
];

export const evaluateMilestones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [outcomes, intentions, checkins, tasks, recovery] = await Promise.all([
      supabase.from("outcomes").select("id, why_it_matters, status").eq("user_id", userId).is("deleted_at", null),
      supabase.from("intentions").select("id, backup_plan").eq("user_id", userId).is("deleted_at", null),
      supabase.from("checkins").select("date, sleep_hours").eq("user_id", userId).order("date", { ascending: false }).limit(30),
      supabase.from("tasks").select("id, status, task_type, completed_at").eq("user_id", userId).is("deleted_at", null),
      supabase.from("recovery_plans").select("id").eq("user_id", userId).is("deleted_at", null).limit(1),
    ]);

    const unlock: string[] = [];
    if ((outcomes.data ?? []).some((o: any) => (o.why_it_matters ?? "").trim().length > 0)) unlock.push("Clarified Intent");
    if ((outcomes.data ?? []).some((o: any) => o.status === "done")) unlock.push("Shipped an Outcome");
    if ((intentions.data ?? []).some((i: any) => (i.backup_plan ?? "").trim().length > 0)) unlock.push("Obstacle Planned");
    if ((checkins.data ?? []).some((c: any) => (c.sleep_hours ?? 0) >= 7.5)) unlock.push("Sleep Protected");
    if ((recovery.data ?? []).length > 0) unlock.push("Contained the Shock");

    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const doneRecent = (tasks.data ?? []).filter(
      (t: any) => t.status === "done" && t.completed_at && new Date(t.completed_at).getTime() > cutoff,
    );
    if (doneRecent.length >= 10) unlock.push("Consistent Executor");
    if ((tasks.data ?? []).filter((t: any) => t.task_type === "deep" && t.status === "done").length >= 5) unlock.push("Deep Focus");

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentDays = new Set(
      (checkins.data ?? [])
        .filter((c: any) => new Date(c.date).getTime() > weekAgo)
        .map((c: any) => c.date),
    );
    if (recentDays.size >= 5) unlock.push("Weekly Reviewer");

    const rows = MILESTONE_CATALOG
      .filter((m) => unlock.includes(m.name))
      .map((m) => ({ user_id: userId, ...m }));

    if (rows.length) {
      await supabase.from("milestones").upsert(rows, { onConflict: "user_id,name" });
    }
    return { unlocked: unlock };
  });
