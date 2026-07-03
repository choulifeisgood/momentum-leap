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
  head: () => ({ meta: [{ title: "AI Task Breakdown" }] }),
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
      const { error } = await supabase.from("daily_tasks").insert({
        user_id: userId,
        title: result.first_step,
        estimated_minutes: 25,
        difficulty: "Easy",
        task_type: "Deep Work",
        task_date: today,
        status: "Not started",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dash-tasks"] });
      toast.success("Added to today's plan.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="AI Task Breakdown"
        description="Drop in any big goal. Get the tiny first step, a 25-min plan, and a backup if you stall."
      />

      <Card><CardContent className="space-y-3 p-6">
        <Textarea
          rows={3}
          placeholder="What goal or task are you trying to complete? e.g., 'Finish first draft of college essay'"
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
          <Section label="First tiny step" text={result.first_step} />
          <Section label="25-minute focus block" text={result.focus_block} />
          <Section label="Specific subtask" text={result.subtask} />
          <Section label="Checkpoint" text={result.checkpoint} />
          <Section label="Possible obstacle" text={result.obstacle} />
          <Section label="Backup plan" text={result.backup} />
          <Section label="If unfinished" text={result.unfinished} />
          <Button onClick={() => addToPlan.mutate()}>
            <Plus className="mr-2 h-4 w-4" /> Add first step to today's plan
          </Button>
        </CardContent></Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Rule-based for now. Connects to OpenAI/Claude/Gemini in a future release without changing this UI.
      </p>
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

function buildBreakdown(g: string): Breakdown {
  const t = g.trim();
  return {
    first_step: `Open the materials needed for "${t}" and read the first instruction or page.`,
    focus_block: `Set a 25-min timer. Work only on "${t}" with phone in another room.`,
    subtask: `Identify one concrete output to finish in this block (one paragraph, one problem set, one page).`,
    checkpoint: `After 25 min, take a 5-min break and ask: did I produce the output? What's the next 25-min target?`,
    obstacle: `Most likely interruption: phone, social apps, or feeling stuck.`,
    backup: `If distracted: turn on Do Not Disturb. If stuck: shrink the next step to something you can definitely do in 2 minutes.`,
    unfinished: `Write down exactly where you stopped and the next sentence/step. Schedule the next block tomorrow.`,
  };
}
