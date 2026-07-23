import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { HeartPulse, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export function CheckInModal() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const yest = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const dismissKey = `am_checkin_dismissed_${today}`;

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

  const save = useMutation({
    mutationFn: async (payload: typeof f) => {
      const { error } = await supabase.from("checkins").upsert(
        { user_id: uid!, date: today, ...payload },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin-modal"] });
      qc.invalidateQueries({ queryKey: ["dash-checkins"] });
      qc.invalidateQueries({ queryKey: ["checkin"] });
      toast.success("Check-in logged.");
      setOpen(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            60-second check-in
          </DialogTitle>
          <DialogDescription>Calibrate today's plan against today's real capacity.</DialogDescription>
        </DialogHeader>

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

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>Skip for today</Button>
            <Button size="sm" onClick={() => save.mutate(f)} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save check-in"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
