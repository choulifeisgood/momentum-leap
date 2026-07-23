import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({ meta: [
    { title: "Trash — Alpha Momentum" },
    { name: "description", content: "Restore or permanently delete items removed in the last 30 days." },
    { property: "og:title", content: "Trash — Alpha Momentum" },
    { property: "og:description", content: "30-day recycling bin for outcomes, tasks, intentions, and recovery plans." },
  ] }),
  component: TrashPage,
});

const TABLES = [
  { table: "outcomes", label: "Outcomes", titleField: "title" },
  { table: "tasks", label: "Tasks", titleField: "title" },
  { table: "intentions", label: "Intentions", titleField: "if_context" },
  { table: "recovery_plans", label: "Recovery plans", titleField: "trigger" },
] as const;

function TrashPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const cutoff = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const q = useQuery({
    queryKey: ["trash", uid],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      for (const t of TABLES) {
        const { data } = await supabase.from(t.table as any).select("*")
          .eq("user_id", uid).not("deleted_at", "is", null).gte("deleted_at", cutoff)
          .order("deleted_at", { ascending: false });
        results[t.table] = data ?? [];
      }
      return results;
    },
  });

  const restore = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).update({ deleted_at: null }).eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Restored."); },
    onError: (e: any) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trash"] }); toast.success("Permanently deleted."); },
    onError: (e: any) => toast.error(e.message),
  });

  const total = q.data ? Object.values(q.data).reduce((n, arr) => n + arr.length, 0) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Trash"
        description="Items deleted in the last 30 days. Anything older is purged automatically."
      />

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!q.isLoading && total === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nothing in trash.
        </CardContent></Card>
      )}

      <div className="space-y-6">
        {TABLES.map((t) => {
          const items = q.data?.[t.table] ?? [];
          if (items.length === 0) return null;
          return (
            <Card key={t.table}>
              <CardHeader><CardTitle className="text-base">{t.label} ({items.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map((row) => {
                  const daysLeft = 30 - differenceInDays(new Date(), new Date(row.deleted_at));
                  return (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row[t.titleField] ?? "(untitled)"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Deleted {format(new Date(row.deleted_at), "MMM d")} · purges in {Math.max(0, daysLeft)}d
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" onClick={() => restore.mutate({ table: t.table, id: row.id })}>
                          <RotateCcw className="mr-1 h-3 w-3" /> Restore
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          if (confirm("Permanently delete? This cannot be undone.")) purge.mutate({ table: t.table, id: row.id });
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
