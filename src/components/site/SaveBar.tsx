import { Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SaveBar({
  dirty,
  save,
  discard,
}: {
  dirty: boolean;
  save: () => Promise<void>;
  discard: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const onSave = async () => {
    setBusy(true);
    try {
      await save();
      toast.success("Changes saved and published");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      {dirty && <span className="text-xs font-medium text-muted-foreground">Unsaved changes</span>}
      <Button variant="outline" size="sm" onClick={discard} disabled={!dirty || busy}>
        <Undo2 className="size-4" /> Discard
      </Button>
      <Button size="sm" onClick={onSave} disabled={!dirty || busy}>
        <Save className="size-4" /> {busy ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
