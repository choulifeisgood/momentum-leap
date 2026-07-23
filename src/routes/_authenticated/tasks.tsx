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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [
    { title: "Today — Alpha Momentum" },
    { name: "description", content: "Your day's execution plan: focused blocks tied to strategic outcomes." },
    { property: "og:title", content: "Today — Alpha Momentum" },
    { property: "og:description", content: "Plan today around your highest-leverage outcomes." },
  ] }),
  component: TasksPage,
});

const ENERGY = ["low", "medium", "high"] as const;
const TYPES = ["deep", "shallow", "admin", "decision", "research", "waiting"] as const;
const STATUSES = ["pending", "in_progress", "done", "deferred"] as const;

function TasksPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const tasks = useQuery({
    queryKey: ["tasks", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_date", today)
        .is("deleted_at", null)
        .order("created_at");
      return data ?? [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["all-outcomes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("outcomes").select("id, title").eq("user_id", userId).is("deleted_at", null).eq("status", "active");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async ({ task, intention }: any) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: userId, task_date: today })
        .select()
        .single();
      if (error) throw error;
      if (intention?.if_context && intention?.then_action) {
        await supabase.from("intentions").insert({
          user_id: userId,
          task_id: data.id,
          if_context: intention.if_context,
          then_action: intention.then_action,
          obstacle: intention.obstacle || null,
          backup_plan: intention.backup_plan || null,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      setOpen(false);
      toast.success("Task saved.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const completed_at = status === "done" ? new Date().toISOString() : null;
      const { error } = await supabase.from("tasks").update({ status, completed_at }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Today"
        description={format(new Date(), "EEEE, MMM d")}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New task</Button></DialogTrigger>
            <TaskDialog
              outcomes={outcomes.data ?? []}
              saving={create.isPending}
              onSave={(t, i) => create.mutate({ task: t, intention: i })}
            />
          </Dialog>
        }
      />

      {tasks.isPending ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : tasks.data && tasks.data.length > 0 ? (
        <div className="space-y-2">
          {tasks.data.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
                <Checkbox
                  checked={t.status === "done"}
                  onCheckedChange={(v) => setStatus.mutate({ id: t.id, status: v ? "done" : "pending" })}
                />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.task_type} · {t.estimated_minutes} min · {t.energy_required} energy
                    {t.planned_time && ` · ${t.planned_time}`}
                  </div>
                </div>
                <Select value={t.status} onValueChange={(v) => setStatus.mutate({ id: t.id, status: v })}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => softDelete.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          No tasks for today. Add one to start executing.
        </CardContent></Card>
      )}
    </PageContainer>
  );
}

function TaskDialog({ outcomes, onSave, saving }: { outcomes: any[]; saving: boolean; onSave: (t: any, i: any) => void }) {
  const [task, setTask] = useState<any>({
    title: "", outcome_id: null, estimated_minutes: 60,
    energy_required: "medium", task_type: "deep", planned_time: "", status: "pending",
  });
  const [intent, setIntent] = useState({
    if_context: "", then_action: "", obstacle: "", backup_plan: "",
  });
  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="e.g., Draft Q3 board deck outline" /></div>
        <div><Label>Related outcome (optional)</Label>
          <Select value={task.outcome_id ?? "none"} onValueChange={(v) => setTask({ ...task, outcome_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {outcomes.map((g) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Minutes</Label><Input type="number" value={task.estimated_minutes} onChange={(e) => setTask({ ...task, estimated_minutes: Number(e.target.value) })} /></div>
          <div><Label>Energy</Label>
            <Select value={task.energy_required} onValueChange={(v) => setTask({ ...task, energy_required: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENERGY.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={task.task_type} onValueChange={(v) => setTask({ ...task, task_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Planned time</Label><Input value={task.planned_time} onChange={(e) => setTask({ ...task, planned_time: e.target.value })} placeholder="e.g., 9:00–10:00" /></div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">Implementation intention (if-then)</div>
          <div className="space-y-2">
            <div><Label className="text-xs">If…</Label><Input value={intent.if_context} onChange={(e) => setIntent({ ...intent, if_context: e.target.value })} placeholder="it is 9:00 after my first coffee" /></div>
            <div><Label className="text-xs">Then I will…</Label><Input value={intent.then_action} onChange={(e) => setIntent({ ...intent, then_action: e.target.value })} placeholder="open the deck and outline 3 sections" /></div>
            <div><Label className="text-xs">Obstacle</Label><Input value={intent.obstacle} onChange={(e) => setIntent({ ...intent, obstacle: e.target.value })} placeholder="slack pings" /></div>
            <div><Label className="text-xs">Backup plan</Label><Input value={intent.backup_plan} onChange={(e) => setIntent({ ...intent, backup_plan: e.target.value })} placeholder="close slack, mute phone for 45 min" /></div>
          </div>
        </div>

        <Button className="w-full" disabled={!task.title || saving} onClick={() => onSave(task, intent)}>{saving ? "Saving…" : "Save task"}</Button>
      </div>
    </DialogContent>
  );
}
