"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateOrderStatus } from "@/actions/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/shipping";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
};

export function OrderStatusUpdater({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (!result.success) {
        setError(result.error ?? "Failed to update status.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as OrderStatus);
          setSaved(false);
        }}
        className="w-full rounded-button border border-border bg-surface px-4 py-2.5 font-sans text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || status === currentStatus}
        className="inline-flex items-center justify-center gap-2 rounded-button bg-primary px-4 py-2.5 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update status
      </button>
      {error && <p className="font-sans text-xs text-error">{error}</p>}
      {saved && <p className="font-sans text-xs text-success">Status updated.</p>}
    </div>
  );
}
