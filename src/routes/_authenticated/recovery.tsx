import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recovery")({
  head: () => ({ meta: [{ title: "Recovery Mode" }] }),
  component: RecoveryPage,
});

function RecoveryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    missed_task: "", reason: "", available_time: "",
    most_important_to_save: "", smallest_next_action: "",
  });
  const [plan, setPlan] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ["recovery", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recovery_plans").select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const generated = buildPlan(form);
      const { error } = await supabase.from("recovery_plans").insert({
        ...form, user_id: userId, recovery_plan_text: generated,
      });
      if (error) throw error;
      // Award badge
      await supabase.from("achievements").upsert(
        { user_id: userId, badge_name: "Recovery Win", badge_description: "Used recovery mode to restart without guilt" },
        { onConflict: "user_id,badge_name" }
      );
      setPlan(generated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recovery"] });
      qc.invalidateQueries({ queryKey: ["dash-badges"] });
      toast.success("Recovery plan saved.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Fell behind? Restart without guilt."
        description="A calm, practical plan to save the most important thing — not catch up on everything."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div><Label>What did you miss?</Label>
            <Input value={form.missed_task} onChange={(e) => setForm({ ...form, missed_task: e.target.value })} placeholder="e.g., AP Bio reading + practice problems" />
          </div>
          <div><Label>Why did it happen? (no judgment)</Label>
            <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div><Label>How much time do you have now?</Label>
            <Input value={form.available_time} onChange={(e) => setForm({ ...form, available_time: e.target.value })} placeholder="e.g., 45 minutes before bed" />
          </div>
          <div><Label>What is the most important thing to save?</Label>
            <Input value={form.most_important_to_save} onChange={(e) => setForm({ ...form, most_important_to_save: e.target.value })} placeholder="e.g., understand the unit concepts" />
          </div>
          <div><Label>What is the smallest useful next action?</Label>
            <Input value={form.smallest_next_action} onChange={(e) => setForm({ ...form, smallest_next_action: e.target.value })} placeholder="e.g., open the textbook to page 142" />
          </div>
          <Button className="w-full" disabled={!form.missed_task} onClick={() => save.mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Generate recovery plan
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <Card className="mt-6 border-success/30 bg-success/5">
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold">Your recovery plan</h3>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{plan}</pre>
          </CardContent>
        </Card>
      )}

      {history.data && history.data.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent recoveries</h3>
          <div className="space-y-2">
            {history.data.map((r) => (
              <Card key={r.id}><CardContent className="p-4">
                <div className="text-sm font-medium">{r.missed_task}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function buildPlan(f: any) {
  return `Step 1 — Stabilize (2 min)
Take three slow breaths. You are not behind, you are restarting. ${f.reason ? `What happened ("${f.reason.slice(0, 80)}") is information, not a verdict.` : ""}

Step 2 — Smallest useful action (do now)
${f.smallest_next_action || "Open the task and read the first instruction."}
Set a 10-minute timer. Just start — momentum is the goal.

Step 3 — Protect the most important thing
With your ${f.available_time || "remaining time"}, focus only on: ${f.most_important_to_save || f.missed_task}.
Skip the rest. You can reschedule unfinished work tomorrow.

Step 4 — Next checkpoint
After this session, do a 1-line check-in: what did I save? Tomorrow's main task gets the first slot.`;
}
