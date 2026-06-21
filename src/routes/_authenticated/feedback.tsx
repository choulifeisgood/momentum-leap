import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [{ title: "Beta Feedback" }] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    confusing: "",
    useful: "",
    return_reason: "",
    bug_report: "",
    rating: 7,
  });

  const previous = useQuery({
    queryKey: ["feedback", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beta_feedback")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.confusing && !form.useful && !form.return_reason && !form.bug_report) {
        throw new Error("Add at least one note before submitting.");
      }
      const { error } = await supabase.from("beta_feedback").insert({
        ...form,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Thanks — your feedback helps shape the next version.");
      setForm({ confusing: "", useful: "", return_reason: "", bug_report: "", rating: 7 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Beta feedback"
        description="You're one of 5 testers. Your honest notes shape the next version."
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <Field
            label="What was confusing or hard to use?"
            value={form.confusing}
            onChange={(v) => setForm({ ...form, confusing: v })}
            placeholder="e.g., I didn't understand recovery mode at first…"
          />
          <Field
            label="What was useful or felt valuable?"
            value={form.useful}
            onChange={(v) => setForm({ ...form, useful: v })}
            placeholder="e.g., The if-then builder helped me actually start studying."
          />
          <Field
            label="What feature would make you return tomorrow?"
            value={form.return_reason}
            onChange={(v) => setForm({ ...form, return_reason: v })}
            placeholder="e.g., A morning reminder, or weekly review email…"
          />
          <Field
            label="Any bug or technical problem?"
            value={form.bug_report}
            onChange={(v) => setForm({ ...form, bug_report: v })}
            placeholder="e.g., The dashboard didn't load after I created my first goal."
          />
          <div>
            <Label className="mb-2 block">Overall rating: {form.rating} / 10</Label>
            <Slider
              value={[form.rating]}
              min={1}
              max={10}
              step={1}
              onValueChange={(v) => setForm({ ...form, rating: v[0] })}
            />
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {save.isPending ? "Submitting…" : "Submit feedback"}
          </Button>
        </CardContent>
      </Card>

      {previous.data && previous.data.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your recent submissions
          </h3>
          <div className="space-y-2">
            {previous.data.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-4 text-sm">
                  <div className="mb-1 text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()} · rating {f.rating ?? "—"}/10
                  </div>
                  {f.useful && <p><span className="font-medium">Useful:</span> {f.useful}</p>}
                  {f.confusing && <p><span className="font-medium">Confusing:</span> {f.confusing}</p>}
                  {f.bug_report && <p><span className="font-medium">Bug:</span> {f.bug_report}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
