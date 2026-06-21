import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({ meta: [{ title: "Daily Check-In" }] }),
  component: CheckinPage,
});

function CheckinPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [reflection, setReflection] = useState<any>(null);

  const existing = useQuery({
    queryKey: ["checkin", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins").select("*")
        .eq("user_id", userId).eq("date", today).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({
    sleep_hours: 7, energy_level: 6, focus_level: 6, deep_work_minutes: 60,
    exercise_today: false, healthy_eating_rating: 3, main_task_completed: false,
    biggest_obstacle: "", main_win: "", stress_level: 4, tomorrow_main_task: "",
  });

  useEffect(() => {
    if (existing.data) setForm(existing.data);
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: userId, date: today };
      delete payload.id; delete payload.created_at;
      const { error } = await supabase.from("daily_checkins").upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;

      // Award achievements
      const badges: { name: string; desc: string }[] = [];
      if (form.sleep_hours >= 7.5) badges.push({ name: "Sleep Protected", desc: "Slept 7.5+ hours" });
      if (form.deep_work_minutes >= 90) badges.push({ name: "Deep Work Starter", desc: "90+ minutes of deep work" });
      if (form.exercise_today && form.healthy_eating_rating >= 4) badges.push({ name: "Healthy Routine Builder", desc: "Exercised and ate well" });
      for (const b of badges) {
        await supabase.from("achievements").upsert(
          { user_id: userId, badge_name: b.name, badge_description: b.desc },
          { onConflict: "user_id,badge_name" }
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin"] });
      qc.invalidateQueries({ queryKey: ["dash-checkins"] });
      qc.invalidateQueries({ queryKey: ["dash-badges"] });
      toast.success("Check-in saved.");
      setReflection(generateReflection(form));
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Daily Check-In" description={format(new Date(), "EEEE, MMM d")} />

      <Card>
        <CardContent className="space-y-6 p-6">
          <Slide label={`Sleep last night: ${form.sleep_hours} hrs`} value={[form.sleep_hours]} min={0} max={12} step={0.5} onChange={(v) => setForm({ ...form, sleep_hours: v[0] })} />
          <Slide label={`Energy level: ${form.energy_level}/10`} value={[form.energy_level]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, energy_level: v[0] })} />
          <Slide label={`Focus level: ${form.focus_level}/10`} value={[form.focus_level]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, focus_level: v[0] })} />
          <div>
            <Label>Deep work minutes today</Label>
            <Input type="number" value={form.deep_work_minutes} onChange={(e) => setForm({ ...form, deep_work_minutes: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>Exercised today</Label>
            <Switch checked={form.exercise_today} onCheckedChange={(v) => setForm({ ...form, exercise_today: v })} />
          </div>
          <Slide label={`Healthy eating: ${form.healthy_eating_rating}/5`} value={[form.healthy_eating_rating]} min={1} max={5} step={1} onChange={(v) => setForm({ ...form, healthy_eating_rating: v[0] })} />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>Main task completed</Label>
            <Switch checked={form.main_task_completed} onCheckedChange={(v) => setForm({ ...form, main_task_completed: v })} />
          </div>
          <Slide label={`Stress: ${form.stress_level}/10`} value={[form.stress_level]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, stress_level: v[0] })} />
          <div>
            <Label>Biggest obstacle today</Label>
            <Textarea rows={2} value={form.biggest_obstacle ?? ""} onChange={(e) => setForm({ ...form, biggest_obstacle: e.target.value })} />
          </div>
          <div>
            <Label>Main win today</Label>
            <Textarea rows={2} value={form.main_win ?? ""} onChange={(e) => setForm({ ...form, main_win: e.target.value })} />
          </div>
          <div>
            <Label>Tomorrow's most important task</Label>
            <Input value={form.tomorrow_main_task ?? ""} onChange={(e) => setForm({ ...form, tomorrow_main_task: e.target.value })} />
          </div>
          <Button className="w-full" onClick={() => save.mutate()}>
            {existing.data ? "Update check-in" : "Save check-in"}
          </Button>
        </CardContent>
      </Card>

      {reflection && (
        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold">Reflection</h3>
            <div className="space-y-2 text-sm">
              <p>✓ <span className="font-medium">Went well:</span> {reflection.well}</p>
              <p>↻ <span className="font-medium">Pattern to watch:</span> {reflection.pattern}</p>
              <p>→ <span className="font-medium">Tomorrow:</span> {reflection.tomorrow}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

function Slide({ label, value, min, max, step, onChange }: any) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Slider value={value} min={min} max={max} step={step} onValueChange={onChange} />
    </div>
  );
}

function generateReflection(f: any) {
  const wellThings = [];
  if (f.sleep_hours >= 7) wellThings.push("you protected your sleep");
  if (f.deep_work_minutes >= 60) wellThings.push(`${f.deep_work_minutes} min of deep work`);
  if (f.main_win) wellThings.push(`a win you named ("${f.main_win.slice(0, 60)}")`);
  if (f.exercise_today) wellThings.push("you moved your body");

  const patterns = [];
  if (f.sleep_hours < 6.5) patterns.push("low sleep may be lowering your focus");
  if (f.stress_level >= 7) patterns.push("stress is high — consider shorter blocks");
  if (f.biggest_obstacle) patterns.push(`"${f.biggest_obstacle.slice(0, 60)}" came up`);

  return {
    well: wellThings[0] ?? "You showed up and tracked your day.",
    pattern: patterns[0] ?? "No obvious pattern today — keep observing.",
    tomorrow: f.tomorrow_main_task
      ? `Start with: ${f.tomorrow_main_task}. Define the smallest first step.`
      : "Pick one most-important task and define when, where, how.",
  };
}
