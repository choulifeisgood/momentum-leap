import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [display_name, setName] = useState("");
  const [student_type, setType] = useState("High school");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name ?? "");
      setType(profile.data.student_type ?? "High school");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        display_name, student_type, updated_at: new Date().toISOString(),
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
      <PageHeader title="Settings" description="Profile, preferences, and account." />

      <Card><CardContent className="space-y-4 p-6">
        <div><Label>Display name</Label><Input value={display_name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Student type</Label>
          <Select value={student_type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="High school">High school</SelectItem>
              <SelectItem value="College">College</SelectItem>
              <SelectItem value="Gap year">Gap year</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()}>Save</Button>
      </CardContent></Card>

      <Card className="mt-6"><CardContent className="space-y-3 p-6">
        <h3 className="font-semibold">Data & privacy</h3>
        <p className="text-sm text-muted-foreground">
          Your check-ins, goals, tasks, intentions, recovery plans, and achievements are private to your account. Other users cannot see your data.
        </p>
        <p className="text-sm text-muted-foreground">
          This product is for productivity and wellness habit support. It is not medical advice, therapy, or diagnosis.
        </p>
      </CardContent></Card>

      <Card className="mt-6"><CardContent className="p-6">
        <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </CardContent></Card>
    </PageContainer>
  );
}
