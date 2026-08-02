import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { HeartPulse, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { getAdaptiveCheckin, getCheckinInsight, type AdaptiveCheckin } from "@/lib/planner.functions";

export function CheckInModal() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const yest = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const dismissKey = `am_checkin_dismissed_${today}`;

  const adaptiveFn = useServerFn(getAdaptiveCheckin);
  const insightFn = useServerFn(getCheckinInsight);

  const q = useQuery({
    queryKey: ["checkin-modal", uid, today],
    enabled: !!uid,
    queryFn: async () => {
      const [t, y] = await Promise.all([
        supabase.from("checkins").select("*").eq("user_id", uid!).eq("date", today).maybeSingle(),
        supabase.from("checkins").select("*").eq("user_id", uid!).eq("date", yest).maybeSingle(),
      ]);
      return { today: t.data, yest: y.data };
    },
  });

  useEffect(() => {
    if (!q.data) return;
    if (q.data.today) return;
    if (typeof window !== "undefined" && localStorage.getItem(dismissKey)) return;
    setOpen(true);
  }, [q.data, dismissKey]);

  const [f, setF] = useState({ energy: 7, stress: 4, available_capacity: 70, main_commitment: "" });
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [insight, setInsight] = useState<{ insight: string; adjustment: string } | null>(null);

  // AI picks today's follow-up questions and pre-fills likely slider values.
  const adaptive = useQuery<AdaptiveCheckin>({
    queryKey: ["checkin-adaptive", uid, today],
    enabled: open && !!uid,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => (await adaptiveFn()) as AdaptiveCheckin,
  });

  useEffect(() => {
    const s = adaptive.data?.suggested;
    if (!s) return;
    setF((prev) => ({
      ...prev,
      energy: s.energy,
      stress: s.stress,
      available_capacity: s.available_capacity,
    }));
  }, [adaptive.data]);

  const save = useMutation({
    mutationFn: async () => {
      const notes = Object.entries(extra)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join(" | ");
      const { error } = await supabase.from("checkins").upsert(
        { user_id: uid!, date: today, ...f, ...(notes ? { unexpected_event: notes } : {}) },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
      try {
        return (await insightFn({ data: { ...f, extra } })) as { insight: string; adjustment: string };
      } catch {
        return null;
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["checkin-modal"] });
      qc.invalidateQueries({ queryKey: ["dash-checkins"] });
      qc.invalidateQueries({ queryKey: ["checkin"] });
      toast.success("Check-in logged.");
      if (res?.insight) setInsight(res);
      else setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function copyYesterday() {
    if (!q.data?.yest) return;
    setF({
      energy: q.data.yest.energy ?? 7,
      stress: q.data.yest.stress ?? 4,
      available_capacity: q.data.yest.available_capacity ?? 70,
      main_commitment: q.data.yest.main_commitment ?? "",
    });
  }

  function dismiss() {
    if (typeof window !== "undefined") localStorage.setItem(dismissKey, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            60-second check-in
          </DialogTitle>
          <DialogDescription>
            {adaptive.data?.greeting ?? "Calibrate today's plan against today's real capacity."}
          </DialogDescription>
        </DialogHeader>

        {insight ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Read on today
              </div>
              <p className="text-sm">{insight.insight}</p>
              {insight.adjustment && <p className="mt-2 text-sm text-muted-foreground">{insight.adjustment}</p>}
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>Got it</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {q.data?.yest && (
              <Button variant="outline" size="sm" className="w-full" onClick={copyYesterday}>
                <RotateCcw className="mr-1 h-3 w-3" /> Nothing changed — use yesterday
              </Button>
            )}
            <div>
              <Label className="mb-2 block text-xs">Energy: {f.energy}/10</Label>
              <Slider value={[f.energy]} min={1} max={10} step={1} onValueChange={(v) => setF({ ...f, energy: v[0] })} />
            </div>
            <div>
              <Label className="mb-2 block text-xs">Stress: {f.stress}/10</Label>
              <Slider value={[f.stress]} min={1} max={10} step={1} onValueChange={(v) => setF({ ...f, stress: v[0] })} />
            </div>
            <div>
              <Label className="mb-2 block text-xs">Available capacity: {f.available_capacity}%</Label>
              <Slider value={[f.available_capacity]} min={0} max={100} step={5} onValueChange={(v) => setF({ ...f, available_capacity: v[0] })} />
            </div>
            <div>
              <Label className="mb-2 block text-xs">Main commitment</Label>
              <Input
                value={f.main_commitment}
                onChange={(e) => setF({ ...f, main_commitment: e.target.value })}
                placeholder="The one thing that has to move today"
              />
            </div>

            {adaptive.isPending && <p className="text-xs text-muted-foreground">Tailoring today's questions…</p>}
            {adaptive.data?.questions.map((qq) => (
              <div key={qq.key}>
                <Label className="mb-2 block text-xs">{qq.label}</Label>
                <Input
                  value={extra[qq.key] ?? ""}
                  onChange={(e) => setExtra({ ...extra, [qq.key]: e.target.value })}
                  placeholder={qq.placeholder}
                />
              </div>
            ))}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={dismiss}>Skip for today</Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save check-in"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
