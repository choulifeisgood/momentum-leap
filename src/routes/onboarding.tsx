import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Get set up — Alpha Momentum" },
    { name: "description", content: "Two-minute setup so Alpha Momentum tunes execution to how you actually work." },
    { property: "og:title", content: "Get set up — Alpha Momentum" },
    { property: "og:description", content: "Tune Alpha Momentum to your role, hours, and top objectives." },
  ] }),
  component: OnboardingPage,
});

const ROLES = ["Founder / CEO", "Executive / Director", "Operator / PM", "Individual contributor", "Investor", "Other"];
const WORK_STYLES = ["Deep-work heavy", "Meeting heavy", "Mixed", "Reactive / firefighting"];
const HEALTH = ["Sleep", "Exercise", "Nutrition", "Stress", "Focus"];

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    role: "",
    profession: "",
    work_style: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    work_start: "09:00",
    work_end: "18:00",
    focus_windows: "Morning",
    health: [] as string[],
    top_objectives: ["", "", ""],
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login" } });
  }, [loading, user, navigate]);

  if (!user) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  const steps = ["You", "Work style", "Hours", "Focus & health", "Top objectives"];
  const total = steps.length;

  function toggleHealth(h: string) {
    setF((p) => ({ ...p, health: p.health.includes(h) ? p.health.filter((x) => x !== h) : [...p.health, h] }));
  }

  async function finish() {
    if (!uid) return;
    setSaving(true);
    try {
      const objectives = f.top_objectives.map((s) => s.trim()).filter(Boolean);
      const { error: pe } = await supabase.from("profiles").update({
        role: f.role || null,
        profession: f.profession || null,
        work_style: f.work_style || null,
        timezone: f.timezone,
        working_hours: { start: f.work_start, end: f.work_end },
        preferred_focus_windows: { window: f.focus_windows },
        health_priorities: f.health,
        top_objectives: objectives.join("\n") || null,
        onboarded_at: new Date().toISOString(),
      }).eq("user_id", uid);
      if (pe) throw pe;

      if (objectives.length) {
        const rows = objectives.map((title) => ({
          user_id: uid, title, priority: "important", status: "active",
        }));
        await supabase.from("outcomes").insert(rows);
      }
      toast.success("You're set. Welcome to Alpha Momentum.");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const canNext = () => {
    if (step === 0) return !!f.role;
    if (step === 1) return !!f.work_style;
    if (step === 4) return f.top_objectives.some((s) => s.trim().length > 2);
    return true;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Alpha Momentum</div>
            <div className="text-xs text-muted-foreground">Step {step + 1} of {total} — {steps[step]}</div>
          </div>
        </div>

        <div className="mb-6 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            {step === 0 && (
              <>
                <div>
                  <Label>What best describes your role?</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setF({ ...f, role: r })}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${f.role === r ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Field / industry (optional)</Label>
                  <Input value={f.profession} onChange={(e) => setF({ ...f, profession: e.target.value })} placeholder="e.g., SaaS, healthcare, fund management" />
                </div>
              </>
            )}

            {step === 1 && (
              <div>
                <Label>How do your days usually look?</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {WORK_STYLES.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setF({ ...f, work_style: w })}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${f.work_style === w ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label>Timezone</Label>
                  <Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Work start</Label>
                    <Input type="time" value={f.work_start} onChange={(e) => setF({ ...f, work_start: e.target.value })} />
                  </div>
                  <div>
                    <Label>Work end</Label>
                    <Input type="time" value={f.work_end} onChange={(e) => setF({ ...f, work_end: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label>When do you focus best?</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    {["Morning", "Midday", "Afternoon", "Evening"].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setF({ ...f, focus_windows: w })}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${f.focus_windows === w ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Health priorities (pick any)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HEALTH.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleHealth(h)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${f.health.includes(h) ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label>What are your top 1–3 objectives right now?</Label>
                <p className="text-xs text-muted-foreground">Each becomes a strategic outcome you can plan against.</p>
                {f.top_objectives.map((v, i) => (
                  <Textarea
                    key={i}
                    rows={2}
                    value={v}
                    placeholder={`Objective ${i + 1}${i === 0 ? " (required)" : " (optional)"}`}
                    onChange={(e) => {
                      const next = [...f.top_objectives];
                      next[i] = e.target.value;
                      setF({ ...f, top_objectives: next });
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < total - 1 ? (
                <Button disabled={!canNext()} onClick={() => setStep(step + 1)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button disabled={!canNext() || saving} onClick={finish}>
                  {saving ? "Saving…" : <>Finish <Check className="ml-1 h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
