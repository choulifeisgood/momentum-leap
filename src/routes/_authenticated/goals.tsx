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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [
    { title: "Outcomes — Alpha Momentum" },
    { name: "description", content: "Your strategic outcomes: what has to be true, by when, and why it matters." },
    { property: "og:title", content: "Outcomes — Alpha Momentum" },
    { property: "og:description", content: "Track the outcomes that move your operating priorities forward." },
  ] }),
  component: OutcomesPage,
});

const PRIORITIES = ["critical", "important", "maintenance", "optional"] as const;
const STATUSES = ["active", "paused", "done", "abandoned"] as const;

function OutcomesPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["outcomes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (g: any) => {
      const payload = { ...g, user_id: userId };
      if (g.id) {
        const { error } = await supabase.from("outcomes").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("outcomes").insert(payload);
        if (error) throw error;
      }
      if (g.why_it_matters?.trim()) {
        await supabase.from("milestones").upsert(
          { user_id: userId, name: "Clarified Intent", description: "Set an outcome with a clear 'why it matters'.", category: "clarity" },
          { onConflict: "user_id,name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcomes"] });
      qc.invalidateQueries({ queryKey: ["dash-goals"] });
      setOpen(false);
      toast.success("Outcome saved.");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save outcome."),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outcomes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcomes"] });
      toast.success("Moved to trash.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const completed_at = status === "done" ? new Date().toISOString() : null;
      const { error } = await supabase.from("outcomes").update({ status, completed_at }).eq("id", id);
      if (error) throw error;
      if (status === "done") {
        await supabase.from("milestones").upsert(
          { user_id: userId, name: "Shipped an Outcome", description: "Closed out a strategic outcome.", category: "execution" },
          { onConflict: "user_id,name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcomes"] });
      qc.invalidateQueries({ queryKey: ["dash-goals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Outcomes"
        description="Two-level hierarchy: strategic outcomes → today's tasks. Every outcome has a metric, a deadline, and a why."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> New outcome</Button>
            </DialogTrigger>
            <OutcomeDialog onSave={(g) => upsert.mutate(g)} saving={upsert.isPending} />
          </Dialog>
        }
      />

      {list.isPending ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : list.isError ? (
        <Card><CardContent className="p-12 text-center">
          <p className="text-sm text-destructive">Could not load outcomes.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => list.refetch()}>Retry</Button>
        </CardContent></Card>
      ) : list.data && list.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((g: any) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    g.priority === "critical" ? "bg-destructive/10 text-destructive" :
                    g.priority === "important" ? "bg-warning/15 text-warning-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{g.priority}</span>
                  {g.deadline && <span className="text-xs text-muted-foreground">by {g.deadline}</span>}
                </div>
                <h3 className="text-lg font-semibold">{g.title}</h3>
                {g.success_metric && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Success metric:</span> {g.success_metric}</p>}
                {g.why_it_matters && <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Why:</span> {g.why_it_matters}</p>}
                {g.constraints && <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Constraints:</span> {g.constraints}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Select value={g.status} onValueChange={(v) => setStatus.mutate({ id: g.id, status: v })}>
                    <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {g.status !== "done" && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: g.id, status: "done" })}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Ship
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => softDelete.mutate(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No outcomes yet. Define what has to be true in the next 4–12 weeks.</p>
        </CardContent></Card>
      )}
    </PageContainer>
  );
}

function OutcomeDialog({ onSave, saving }: { onSave: (g: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    title: "", priority: "important", status: "active",
    success_metric: "", why_it_matters: "", deadline: "", constraints: "", non_goals: "",
  });
  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New outcome</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Close $250K in new pipeline by Q3" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
        </div>
        <div><Label>Success metric</Label><Input value={form.success_metric} onChange={(e) => setForm({ ...form, success_metric: e.target.value })} placeholder="What proves it's done?" /></div>
        <div><Label>Why it matters</Label>
          <Textarea rows={2} value={form.why_it_matters} onChange={(e) => setForm({ ...form, why_it_matters: e.target.value })} placeholder="Strategic reason — what breaks if you don't do this?" />
        </div>
        <div><Label>Constraints</Label><Input value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="Budget, headcount, timeline, dependencies…" /></div>
        <div><Label>Non-goals</Label><Input value={form.non_goals} onChange={(e) => setForm({ ...form, non_goals: e.target.value })} placeholder="What you're explicitly NOT doing here." /></div>
        <Button className="w-full" disabled={!form.title || saving} onClick={() => onSave({ ...form, deadline: form.deadline || null })}>
          {saving ? "Saving…" : "Save outcome"}
        </Button>
      </div>
    </DialogContent>
  );
}
