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
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({ meta: [
    { title: "Daily Check-In — Alpha Momentum" },
    { name: "description", content: "One-minute performance check-in: energy, stress, sleep, capacity, main commitment." },
    { property: "og:title", content: "Daily Check-In — Alpha Momentum" },
    { property: "og:description", content: "Calibrate today's plan against today's real capacity." },
  ] }),
  component: CheckinPage,
});

function CheckinPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const existing = useQuery({
    queryKey: ["checkin", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("checkins").select("*")
        .eq("user_id", userId).eq("date", today).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({
    energy: 7, stress: 4, sleep_hours: 7, sleep_quality: 7,
    available_capacity: 70, main_commitment: "", obstacle: "", unexpected_event: "",
  });

  useEffect(() => {
    if (existing.data) setForm({
      energy: existing.data.energy ?? 7,
      stress: existing.data.stress ?? 4,
      sleep_hours: existing.data.sleep_hours ?? 7,
      sleep_quality: existing.data.sleep_quality ?? 7,
      available_capacity: existing.data.available_capacity ?? 70,
      main_commitment: existing.data.main_commitment ?? "",
      obstacle: existing.data.obstacle ?? "",
      unexpected_event: existing.data.unexpected_event ?? "",
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: userId, date: today };
      const { error } = await supabase.from("checkins").upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;
      if (form.sleep_hours >= 7.5) {
        await supabase.from("milestones").upsert(
          { user_id: userId, name: "Sleep Protected", description: "Logged 7.5+ hours of sleep.", category: "health" },
          { onConflict: "user_id,name" },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin"] });
      qc.invalidateQueries({ queryKey: ["dash-checkins"] });
      toast.success(existing.data ? "Check-in updated." : "Check-in saved.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Daily Check-In" description={format(new Date(), "EEEE, MMM d")} />
      <Card>
        <CardContent className="space-y-6 p-6">
          <Slide label={`Sleep: ${form.sleep_hours} hrs`} value={[form.sleep_hours]} min={0} max={12} step={0.5} onChange={(v) => setForm({ ...form, sleep_hours: v[0] })} />
          <Slide label={`Sleep quality: ${form.sleep_quality}/10`} value={[form.sleep_quality]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, sleep_quality: v[0] })} />
          <Slide label={`Energy: ${form.energy}/10`} value={[form.energy]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, energy: v[0] })} />
          <Slide label={`Stress: ${form.stress}/10`} value={[form.stress]} min={1} max={10} step={1} onChange={(v) => setForm({ ...form, stress: v[0] })} />
          <Slide label={`Available capacity today: ${form.available_capacity}%`} value={[form.available_capacity]} min={0} max={100} step={5} onChange={(v) => setForm({ ...form, available_capacity: v[0] })} />
          <div>
            <Label>Main commitment for today</Label>
            <Input value={form.main_commitment} onChange={(e) => setForm({ ...form, main_commitment: e.target.value })} placeholder="The one thing that has to move." />
          </div>
          <div>
            <Label>Biggest obstacle</Label>
            <Textarea rows={2} value={form.obstacle} onChange={(e) => setForm({ ...form, obstacle: e.target.value })} />
          </div>
          <div>
            <Label>Unexpected event / context</Label>
            <Textarea rows={2} value={form.unexpected_event} onChange={(e) => setForm({ ...form, unexpected_event: e.target.value })} placeholder="Anything the plan should account for?" />
          </div>
          {existing.data && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              You already checked in today. Edits update today's entry — no duplicate is created.
            </p>
          )}
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : existing.data ? "Update check-in" : "Save check-in"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Slide({ label, value, min, max, step, onChange }: { label: string; value: number[]; min: number; max: number; step: number; onChange: (v: number[]) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Slider value={value} min={min} max={max} step={step} onValueChange={onChange} />
    </div>
  );
}
