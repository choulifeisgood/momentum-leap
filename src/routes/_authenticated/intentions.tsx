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
  head: () => ({ meta: [{ title: "Implementation Intentions" }] }),
  component: IntentionsPage,
});

function IntentionsPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    if_context: "", then_action: "", duration: "", obstacle: "", backup_plan: "",
  });

  const list = useQuery({
    queryKey: ["intentions", userId],
    queryFn: async () => {
      const { data } = await supabase.from("implementation_intentions")
        .select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("implementation_intentions").insert({ ...form, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intentions"] });
      setForm({ if_context: "", then_action: "", duration: "", obstacle: "", backup_plan: "" });
      toast.success("Intention saved.");
    },
  });

  const preview = `If it is ${form.if_context || "[time/context]"}, then I will ${form.then_action || "[specific action]"} for ${form.duration || "[duration]"}. If ${form.obstacle || "[obstacle]"} happens, then I will ${form.backup_plan || "[backup plan]"}.`;

  return (
    <PageContainer>
      <PageHeader
        title="If-Then Builder"
        description="Turn vague intentions into specific plans. Backed by 20+ years of behavior-change research."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="space-y-3 p-6">
          <div><Label>If it is… (time / context)</Label>
            <Input value={form.if_context} onChange={(e) => setForm({ ...form, if_context: e.target.value })} placeholder="7:30pm after dinner" />
          </div>
          <div><Label>Then I will… (specific action)</Label>
            <Input value={form.then_action} onChange={(e) => setForm({ ...form, then_action: e.target.value })} placeholder="practice SAT Math" />
          </div>
          <div><Label>For how long</Label>
            <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="25 minutes" />
          </div>
          <div><Label>Possible obstacle</Label>
            <Input value={form.obstacle} onChange={(e) => setForm({ ...form, obstacle: e.target.value })} placeholder="phone notifications" />
          </div>
          <div><Label>Backup plan</Label>
            <Input value={form.backup_plan} onChange={(e) => setForm({ ...form, backup_plan: e.target.value })} placeholder="put phone in another room" />
          </div>
          <Button className="w-full" disabled={!form.if_context || !form.then_action} onClick={() => save.mutate()}>
            <Zap className="mr-2 h-4 w-4" /> Save intention
          </Button>
        </CardContent></Card>

        <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Preview</div>
          <p className="text-base leading-relaxed">{preview}</p>
        </CardContent></Card>
      </div>

      {list.data && list.data.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your intentions</h3>
          <div className="space-y-2">
            {list.data.map((i) => (
              <Card key={i.id}><CardContent className="p-4 text-sm">
                <p>If it is <strong>{i.if_context}</strong>, then I will <strong>{i.then_action}</strong>{i.duration && ` for ${i.duration}`}.</p>
                {i.obstacle && <p className="mt-1 text-xs text-muted-foreground">If {i.obstacle} → {i.backup_plan}</p>}
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
