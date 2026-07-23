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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — Alpha Momentum" },
    { name: "description", content: "Profile, working preferences, and account for Alpha Momentum." },
    { property: "og:title", content: "Settings — Alpha Momentum" },
    { property: "og:description", content: "Configure how Alpha Momentum works for you." },
  ] }),
  component: SettingsPage,
});

const ROLES = ["Founder / CEO", "Executive", "Manager", "Individual Contributor", "Student", "Investor", "Other"];

function SettingsPage() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    display_name: "",
    role: "",
    profession: "",
    top_objectives: "",
    tone: "direct",
  });

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) setForm({
      display_name: profile.data.display_name ?? "",
      role: profile.data.role ?? "",
      profession: profile.data.profession ?? "",
      top_objectives: profile.data.top_objectives ?? "",
      tone: profile.data.tone ?? "direct",
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        ...form,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Profile, working preferences, and account." />

      <Card><CardContent className="space-y-4 p-6">
        <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Role</Label>
          <Select value={form.role || undefined} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Profession / industry</Label><Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="e.g., SaaS founder, VC associate" /></div>
        <div><Label>Top objectives (this quarter)</Label>
          <Textarea rows={3} value={form.top_objectives} onChange={(e) => setForm({ ...form, top_objectives: e.target.value })} placeholder="What has to be true by end of quarter." />
        </div>
        <div><Label>Coach tone</Label>
          <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="supportive">Supportive</SelectItem>
              <SelectItem value="analytical">Analytical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent></Card>

      <Card className="mt-6"><CardContent className="space-y-3 p-6">
        <h3 className="font-semibold">Data & privacy</h3>
        <p className="text-sm text-muted-foreground">
          Your outcomes, tasks, check-ins, intentions, recovery plans, and milestones are private to your account. Other users cannot see your data.
        </p>
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Alpha Momentum supports professional performance and wellness habits. It is not medical advice, therapy, or diagnosis.
        </p>
      </CardContent></Card>

      <Card className="mt-6"><CardContent className="p-6">
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </CardContent></Card>
    </PageContainer>
  );
}
