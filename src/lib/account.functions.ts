import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = [
  "profiles",
  "strategic_areas",
  "outcomes",
  "tasks",
  "intentions",
  "checkins",
  "recovery_plans",
  "milestones",
  "feedback",
  "agent_actions",
] as const;

export const exportUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId };
    for (const t of TABLES) {
      const { data } = await (supabase as any).from(t).select("*").eq("user_id", userId);
      out[t] = data ?? [];
    }
    return out;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of TABLES) {
      if (t === "profiles") continue;
      await (supabaseAdmin as any).from(t).delete().eq("user_id", userId);
    }
    await (supabaseAdmin as any).from("profiles").delete().eq("user_id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
