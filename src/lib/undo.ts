import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Soft-delete a row and show a toast with a 30s Undo action that restores it.
 */
export function softDeleteWithUndo(opts: {
  table: "tasks" | "outcomes" | "intentions" | "recovery_plans" | "strategic_areas";
  id: string;
  label?: string;
  onChange?: () => void;
}) {
  const { table, id, label = "Item", onChange } = opts;
  supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        toast.error(error.message);
        return;
      }
      onChange?.();
      toast(`${label} moved to Trash.`, {
        duration: 30000,
        action: {
          label: "Undo",
          onClick: async () => {
            const { error: e2 } = await supabase
              .from(table)
              .update({ deleted_at: null })
              .eq("id", id);
            if (e2) toast.error(e2.message);
            else {
              toast.success(`${label} restored.`);
              onChange?.();
            }
          },
        },
      });
    });
}
