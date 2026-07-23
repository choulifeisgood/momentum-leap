import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateBreakdown, type Breakdown } from "@/lib/breakdown.functions";

export const Route = createFileRoute("/_authenticated/breakdown")({
  head: () => ({ meta: [
    { title: "AI Breakdown — Alpha Momentum" },
    { name: "description", content: "Drop in any outcome. Get the smallest next step, 60-min focus block, and backup." },
    { property: "og:title", content: "AI Breakdown — Alpha Momentum" },
    { property: "og:description", content: "Turn ambiguous outcomes into a concrete first block." },
  ] }),
  component: BreakdownPage,
});

function BreakdownPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<Breakdown | null>(null);
  const runBreakdown = useServerFn(generateBreakdown);

  const generate = useMutation({
    mutationFn: async () => runBreakdown({ data: { goal: goal.trim() } }),
    onSuccess: (r) => setResult(r),
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate breakdown"),
  });

  const addToPlan = useMutation({
    mutationFn: async () => {
      if (!result) return;
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase.from("tasks").insert({
        user_id: userId,
        title: result.first_step,
        estimated_minutes: 60,
        energy_required: "medium",
        task_type: "deep",
        task_date: today,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Added to today's plan.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="AI Breakdown"
        description="Drop in any strategic outcome. Get the first move, a focus block, and a backup."
      />
      <Card><CardContent className="space-y-3 p-6">
        <Textarea
          rows={3}
          placeholder="Outcome or task you want to move. e.g., 'Ship pricing v2 by end of month'"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <Button onClick={() => generate.mutate()} disabled={!goal.trim() || generate.isPending}>
          {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          {generate.isPending ? "Thinking…" : "Break it down"}
        </Button>
      </CardContent></Card>

      {result && (
        <Card className="mt-6"><CardContent className="space-y-4 p-6">
          <Section label="First move" text={result.first_step} />
          <Section label="Focus block" text={result.focus_block} />
          <Section label="Concrete subtask" text={result.subtask} />
          <Section label="Checkpoint" text={result.checkpoint} />
          <Section label="Likely obstacle" text={result.obstacle} />
          <Section label="Backup plan" text={result.backup} />
          <Section label="If unfinished" text={result.unfinished} />
          <Button onClick={() => addToPlan.mutate()}>
            <Plus className="mr-2 h-4 w-4" /> Add first move to today
          </Button>
        </CardContent></Card>
      )}
    </PageContainer>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{label}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
