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
  head: () => ({ meta: [{ title: "Weekly Goals" }] }),
  component: GoalsPage,
});

const CATEGORIES = ["School", "SAT/ACT", "Competition", "Research", "Health", "College Prep", "Personal", "Other"];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Not started", "In progress", "Completed"];

function GoalsPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const goals = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (g: any) => {
      const payload = { ...g, user_id: userId };
      if (g.id) {
        const { error } = await supabase.from("weekly_goals").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("weekly_goals").insert(payload);
        if (error) throw error;
      }
      if (g.why_it_matters && g.why_it_matters.trim().length > 0) {
        await supabase.from("achievements").upsert(
          { user_id: userId, badge_name: "Future Self Builder", badge_description: "Set a goal with a clear 'why it matters'." },
          { onConflict: "user_id,badge_name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dash-goals"] });
      qc.invalidateQueries({ queryKey: ["all-badges"] });
      setOpen(false);
      toast.success("Goal saved.");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save goal."),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    onError: (e: any) => toast.error(e.message ?? "Could not delete goal."),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const completed_at = status === "Completed" ? new Date().toISOString() : null;
      const { error } = await supabase.from("weekly_goals").update({ status, completed_at }).eq("id", id);
      if (error) throw error;
      if (status === "Completed") {
        await supabase.from("achievements").upsert(
          { user_id: userId, badge_name: "Weekly Finisher", badge_description: "Completed a weekly goal." },
          { onConflict: "user_id,badge_name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dash-goals"] });
      qc.invalidateQueries({ queryKey: ["all-badges"] });
      qc.invalidateQueries({ queryKey: ["dash-badges"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update goal."),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Weekly Goals"
        description="Turn ambition into outcomes. Each goal needs a 'why' and a smallest next action."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> New goal</Button>
            </DialogTrigger>
            <GoalDialogContent onSave={(g) => upsert.mutate(g)} />
          </Dialog>
        }
      />

      {goals.isPending ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading your goals…</CardContent></Card>
      ) : goals.isError ? (
        <Card><CardContent className="p-12 text-center">
          <p className="text-sm text-destructive">Could not load goals. Check your connection and try again.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => goals.refetch()}>Retry</Button>
        </CardContent></Card>
      ) : goals.data && goals.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.data.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-foreground">{g.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    g.priority === "High" ? "bg-destructive/10 text-destructive" :
                    g.priority === "Medium" ? "bg-warning/15 text-warning-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{g.priority}</span>
                  {g.target_date && <span className="text-xs text-muted-foreground">by {g.target_date}</span>}
                </div>
                <h3 className="text-lg font-semibold">{g.title}</h3>
                {g.why_it_matters && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Why:</span> {g.why_it_matters}</p>}
                {g.smallest_next_action && <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Next:</span> {g.smallest_next_action}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Select value={g.status} onValueChange={(v) => setStatus.mutate({ id: g.id, status: v })}>
                    <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {g.status !== "Completed" && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: g.id, status: "Completed" })}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => del.mutate(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No goals yet. Create your first weekly goal.</p>
        </CardContent></Card>
      )}
    </PageContainer>
  );
}

function GoalDialogContent({ onSave }: { onSave: (g: any) => void }) {
  const [form, setForm] = useState({
    title: "", category: "School", priority: "Medium",
    target_date: "", why_it_matters: "", smallest_next_action: "", status: "Not started",
  });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>New weekly goal</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Goal title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Finish AP Bio Unit 3" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Target date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
        <div><Label>Why does this goal matter to your future self?</Label>
          <Textarea value={form.why_it_matters} onChange={(e) => setForm({ ...form, why_it_matters: e.target.value })} placeholder="The deeper reason this matters…" rows={3} />
        </div>
        <div><Label>Smallest next action</Label>
          <Input value={form.smallest_next_action} onChange={(e) => setForm({ ...form, smallest_next_action: e.target.value })} placeholder="The tiniest first step you could take today" />
        </div>
        <Button className="w-full" disabled={!form.title} onClick={() => onSave({ ...form, target_date: form.target_date || null })}>
          Save goal
        </Button>
      </div>
    </DialogContent>
  );
}
