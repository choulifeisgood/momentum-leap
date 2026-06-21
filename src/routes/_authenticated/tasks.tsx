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
  head: () => ({ meta: [{ title: "Today's Tasks" }] }),
  component: TasksPage,
});

const DIFFICULTY = ["Easy", "Medium", "Hard"];
const TYPES = ["Deep Work", "Review", "Admin", "Health", "Recovery"];
const STATUSES = ["Not started", "In progress", "Completed"];

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
        .from("daily_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_date", today)
        .order("created_at");
      return data ?? [];
    },
  });

  const goals = useQuery({
    queryKey: ["all-goals", userId],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_goals").select("id, title").eq("user_id", userId);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async ({ task, intention }: any) => {
      const { data, error } = await supabase
        .from("daily_tasks")
        .insert({ ...task, user_id: userId, task_date: today })
        .select()
        .single();
      if (error) throw error;
      if (intention?.if_context && intention?.then_action) {
        await supabase.from("implementation_intentions").insert({
          ...intention, user_id: userId, task_id: data.id,
        });
        if (intention.obstacle && intention.backup_plan) {
          await supabase.from("achievements").upsert(
            { user_id: userId, badge_name: "Obstacle Solver", badge_description: "Created an if-then plan with a backup." },
            { onConflict: "user_id,badge_name" },
          );
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-week-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-badges"] });
      qc.invalidateQueries({ queryKey: ["dash-badges"] });
      setOpen(false);
      toast.success("Task saved.");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save task."),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const completed_at = status === "Completed" ? new Date().toISOString() : null;
      const { error } = await supabase.from("daily_tasks").update({ status, completed_at }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-week-tasks"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update task."),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message ?? "Could not delete task."),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Today's Tasks"
        description={format(new Date(), "EEEE, MMM d")}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New task</Button></DialogTrigger>
            <TaskDialog
              goals={goals.data ?? []}
              saving={create.isPending}
              onSave={(t, i) => create.mutate({ task: t, intention: i })}
            />
          </Dialog>
        }
      />

      {tasks.isPending ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading today's tasks…</CardContent></Card>
      ) : tasks.isError ? (
        <Card><CardContent className="p-12 text-center">
          <p className="text-sm text-destructive">Could not load tasks. Check your connection and try again.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => tasks.refetch()}>Retry</Button>
        </CardContent></Card>
      ) : tasks.data && tasks.data.length > 0 ? (
        <div className="space-y-2">
          {tasks.data.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
                <Checkbox
                  checked={t.status === "Completed"}
                  onCheckedChange={(v) => setStatus.mutate({ id: t.id, status: v ? "Completed" : "Not started" })}
                />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${t.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.task_type} · {t.estimated_minutes} min · {t.difficulty}
                    {t.planned_time && ` · ${t.planned_time}`}
                  </div>
                </div>
                <Select value={t.status} onValueChange={(v) => setStatus.mutate({ id: t.id, status: v })}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          No tasks yet. Add one task to start today's execution plan.
        </CardContent></Card>
      )}
    </PageContainer>
  );
}

function TaskDialog({ goals, onSave, saving }: { goals: any[]; saving: boolean; onSave: (t: any, i: any) => void }) {
  const [task, setTask] = useState<any>({
    title: "", weekly_goal_id: null, estimated_minutes: 25,
    difficulty: "Medium", task_type: "Deep Work", planned_time: "", status: "Not started",
  });
  const [intent, setIntent] = useState({
    if_context: "", then_action: "", duration: "", obstacle: "", backup_plan: "",
  });
  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="e.g., 25-min SAT Math drills" /></div>
        <div><Label>Related weekly goal (optional)</Label>
          <Select value={task.weekly_goal_id ?? "none"} onValueChange={(v) => setTask({ ...task, weekly_goal_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Minutes</Label><Input type="number" value={task.estimated_minutes} onChange={(e) => setTask({ ...task, estimated_minutes: Number(e.target.value) })} /></div>
          <div><Label>Difficulty</Label>
            <Select value={task.difficulty} onValueChange={(v) => setTask({ ...task, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIFFICULTY.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={task.task_type} onValueChange={(v) => setTask({ ...task, task_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Planned time</Label><Input value={task.planned_time} onChange={(e) => setTask({ ...task, planned_time: e.target.value })} placeholder="e.g., 7:30pm" /></div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">Implementation intention (if-then)</div>
          <p className="mb-3 text-xs text-muted-foreground">
            Research shows specifying when, where, and how dramatically increases follow-through.
          </p>
          <div className="space-y-2">
            <div><Label className="text-xs">If…</Label><Input value={intent.if_context} onChange={(e) => setIntent({ ...intent, if_context: e.target.value })} placeholder="it is 7:30pm after dinner" /></div>
            <div><Label className="text-xs">Then I will…</Label><Input value={intent.then_action} onChange={(e) => setIntent({ ...intent, then_action: e.target.value })} placeholder="practice SAT Math" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">For how long</Label><Input value={intent.duration} onChange={(e) => setIntent({ ...intent, duration: e.target.value })} placeholder="25 min" /></div>
              <div><Label className="text-xs">Possible obstacle</Label><Input value={intent.obstacle} onChange={(e) => setIntent({ ...intent, obstacle: e.target.value })} placeholder="phone distraction" /></div>
            </div>
            <div><Label className="text-xs">Backup plan</Label><Input value={intent.backup_plan} onChange={(e) => setIntent({ ...intent, backup_plan: e.target.value })} placeholder="put phone in other room" /></div>
          </div>
        </div>

        <Button className="w-full" disabled={!task.title || saving} onClick={() => onSave(task, intent)}>{saving ? "Saving…" : "Save task"}</Button>
      </div>
    </DialogContent>
  );
}
