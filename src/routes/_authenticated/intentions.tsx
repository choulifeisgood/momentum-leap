import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/intentions")({
  head: () => ({ meta: [
    { title: "Intentions — Alpha Momentum" },
    { name: "description", content: "Convert vague plans into if-then intentions with backup plans." },
    { property: "og:title", content: "Intentions — Alpha Momentum" },
    { property: "og:description", content: "If-then plans that survive contact with reality." },
  ] }),
  component: IntentionsPage,
});

function IntentionsPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    if_context: "", then_action: "", obstacle: "", backup_plan: "",
  });

  const list = useQuery({
    queryKey: ["intentions", userId],
    queryFn: async () => {
      const { data } = await supabase.from("intentions")
        .select("*").eq("user_id", userId).is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intentions").insert({ ...form, user_id: userId });
      if (error) throw error;
      if (form.obstacle && form.backup_plan) {
        await supabase.from("milestones").upsert(
          { user_id: userId, name: "Obstacle Planned", description: "Wrote an if-then with a real backup plan.", category: "planning" },
          { onConflict: "user_id,name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intentions"] });
      setForm({ if_context: "", then_action: "", obstacle: "", backup_plan: "" });
      toast.success("Intention saved.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const preview = `If ${form.if_context || "[trigger/context]"}, then I will ${form.then_action || "[specific action]"}. If ${form.obstacle || "[obstacle]"} happens, then I will ${form.backup_plan || "[backup]"}.`;

  return (
    <PageContainer>
      <PageHeader
        title="If-Then Builder"
        description="Convert intent into pre-decided behavior. Backed by 20+ years of behavioral research."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="space-y-3 p-6">
          <div><Label>If… (trigger / context)</Label>
            <Input value={form.if_context} onChange={(e) => setForm({ ...form, if_context: e.target.value })} placeholder="it is 9:00 after standup" />
          </div>
          <div><Label>Then I will… (specific action)</Label>
            <Input value={form.then_action} onChange={(e) => setForm({ ...form, then_action: e.target.value })} placeholder="close slack and open the deck for 45 min" />
          </div>
          <div><Label>Possible obstacle</Label>
            <Input value={form.obstacle} onChange={(e) => setForm({ ...form, obstacle: e.target.value })} placeholder="an urgent ping" />
          </div>
          <div><Label>Backup plan</Label>
            <Input value={form.backup_plan} onChange={(e) => setForm({ ...form, backup_plan: e.target.value })} placeholder="triage in 2 min, mute for 45" />
          </div>
          <Button className="w-full" disabled={!form.if_context || !form.then_action || save.isPending} onClick={() => save.mutate()}>
            <Zap className="mr-2 h-4 w-4" /> {save.isPending ? "Saving…" : "Save intention"}
          </Button>
        </CardContent></Card>

        <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Preview</div>
          <p className="text-base leading-relaxed">{preview}</p>
        </CardContent></Card>
      </div>

      <div className="mt-10">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your intentions</h3>
        {list.isPending ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : list.data && list.data.length > 0 ? (
          <div className="space-y-2">
            {list.data.map((i: any) => (
              <Card key={i.id}><CardContent className="p-4 text-sm">
                <p>If <strong>{i.if_context}</strong>, then I will <strong>{i.then_action}</strong>.</p>
                {i.obstacle && <p className="mt-1 text-xs text-muted-foreground">If {i.obstacle} → {i.backup_plan}</p>}
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No intentions yet.</CardContent></Card>
        )}
      </div>
    </PageContainer>
  );
}
