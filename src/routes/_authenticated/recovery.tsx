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
  head: () => ({ meta: [
    { title: "Recovery — Alpha Momentum" },
    { name: "description", content: "Fell behind or hit a shock? Build a professional recovery plan in under 2 minutes." },
    { property: "og:title", content: "Recovery — Alpha Momentum" },
    { property: "og:description", content: "Contain the damage, protect the critical outcome, restart." },
  ] }),
  component: RecoveryPage,
});

function RecoveryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    trigger: "", what_changed: "", remaining_capacity: "",
    must_save: "", defer_list: "", smallest_action: "",
  });
  const [plan, setPlan] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ["recovery", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recovery_plans").select("*")
        .eq("user_id", userId).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const generated = buildPlan(form);
      const { error } = await supabase.from("recovery_plans").insert({
        ...form, user_id: userId, plan_text: generated,
      });
      if (error) throw error;
      await supabase.from("milestones").upsert(
        { user_id: userId, name: "Contained the Shock", description: "Used recovery mode to restart cleanly.", category: "resilience" },
        { onConflict: "user_id,name" }
      );
      setPlan(generated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recovery"] });
      toast.success("Recovery plan saved.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Recovery mode"
        description="Reduce scope. Protect the critical outcome. Restart in 10 minutes."
      />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div><Label>What triggered this?</Label>
            <Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="e.g., missed a critical deadline / illness / customer escalation" />
          </div>
          <div><Label>What changed since the plan?</Label>
            <Textarea rows={2} value={form.what_changed} onChange={(e) => setForm({ ...form, what_changed: e.target.value })} />
          </div>
          <div><Label>Remaining capacity today</Label>
            <Input value={form.remaining_capacity} onChange={(e) => setForm({ ...form, remaining_capacity: e.target.value })} placeholder="e.g., 90 minutes before EOD" />
          </div>
          <div><Label>Must save (protect at all costs)</Label>
            <Input value={form.must_save} onChange={(e) => setForm({ ...form, must_save: e.target.value })} placeholder="The single outcome that cannot slip." />
          </div>
          <div><Label>Defer / drop</Label>
            <Textarea rows={2} value={form.defer_list} onChange={(e) => setForm({ ...form, defer_list: e.target.value })} placeholder="Everything you'll intentionally push." />
          </div>
          <div><Label>Smallest next action (do now)</Label>
            <Input value={form.smallest_action} onChange={(e) => setForm({ ...form, smallest_action: e.target.value })} placeholder="The 10-minute step that starts recovery." />
          </div>
          <Button className="w-full" disabled={!form.trigger || save.isPending} onClick={() => save.mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" /> {save.isPending ? "Saving…" : "Generate recovery plan"}
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
            {history.data.map((r: any) => (
              <Card key={r.id}><CardContent className="p-4">
                <div className="text-sm font-medium">{r.trigger || "Recovery"}</div>
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
  return `1. Contain (2 min)
Name the trigger without judgment: ${f.trigger || "the disruption"}. ${f.what_changed ? `What changed: ${f.what_changed}.` : ""}

2. Protect the critical outcome
With ${f.remaining_capacity || "your remaining time"}, defend only: ${f.must_save || f.trigger}.

3. Defer everything else
Explicitly drop or push: ${f.defer_list || "everything not on the must-save line"}.

4. Restart in 10 minutes
Do this now: ${f.smallest_action || "the smallest step that unblocks the critical outcome"}.
Timer: 10 minutes. Momentum, not perfection.

5. Debrief tonight
Log a check-in. One line: what you saved, what you dropped, what to change tomorrow.`;
}
