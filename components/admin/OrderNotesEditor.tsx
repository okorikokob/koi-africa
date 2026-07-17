"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateOrderNotes } from "@/actions/orders";

type Props = {
  orderId: string;
  initialNotes: string;
};

export function OrderNotesEditor({ orderId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderNotes(orderId, notes);
      if (!result.success) {
        setError(result.error ?? "Failed to save notes.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder="Internal notes — not visible to the customer"
        className="w-full resize-none rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-button bg-success px-4 py-2 font-sans text-sm font-bold text-white transition-colors hover:brightness-95 disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save notes
      </button>
      {error && <p className="font-sans text-xs text-error">{error}</p>}
      {saved && <p className="font-sans text-xs text-success">Notes saved.</p>}
    </div>
  );
}
