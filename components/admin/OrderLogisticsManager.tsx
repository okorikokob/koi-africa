"use client";

import { useActionState, useState } from "react";
import { CircleCheck, PackagePlus, Plus, Scale, Trash2 } from "lucide-react";
import {
  recordOrderLogisticsAmount,
  recordOrderMeasurements,
  settleOrderLogisticsAdjustment,
  type OrderActionState,
} from "@/actions/orders";
import type { LogisticsReconciliationStatus } from "@/lib/admin-logistics";
import type { OrderStatus } from "@/lib/shipping";
import { formatNaira } from "@/lib/currency";

type ShipmentPackage = {
  id: string;
  pieceNumber: number;
  actualWeightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  measuredAt: Date;
};

type Props = {
  orderId: string;
  orderStatus: OrderStatus;
  depositMinor: number;
  actualLogisticsMinor: number | null;
  adjustmentMinor: number | null;
  reconciliationStatus: LogisticsReconciliationStatus;
  shipment: {
    publicReference: string;
    provider: string;
    status: string;
    measuredAt: Date | null;
    packages: ShipmentPackage[];
  } | null;
};

const initialState: OrderActionState = { success: false };
const inputClass = "w-full rounded-[12px] border-[1.5px] border-border bg-background px-3.5 py-3 font-sans text-sm text-text-primary outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary-soft";

function ActionMessage({ state }: { state: OrderActionState }) {
  if (state.error) return <p role="alert" className="font-sans text-xs font-semibold text-error">{state.error}</p>;
  if (state.success) return <p role="status" className="font-sans text-xs font-semibold text-success">Saved successfully.</p>;
  return null;
}

function MeasurementForm({ orderId }: { orderId: string }) {
  const action = recordOrderMeasurements.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [pieces, setPieces] = useState([1]);
  const [nextPiece, setNextPiece] = useState(2);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-4">
      <label className="flex max-w-48 flex-col gap-1.5 font-sans text-[11px] font-semibold text-text-secondary">Origin country code<input className={inputClass} name="originCountryCode" defaultValue="US" maxLength={2} pattern="[A-Za-z]{2}" required /></label>
      {pieces.map((piece, index) => (
        <fieldset key={piece} className="rounded-[12px] border border-border bg-background p-3.5">
          <div className="flex items-center justify-between gap-3">
            <legend className="font-sans text-xs font-bold text-text-primary">Package {index + 1}</legend>
            {pieces.length > 1 && (
              <button type="button" onClick={() => setPieces((current) => current.filter((id) => id !== piece))} className="rounded-lg p-1.5 text-text-muted hover:bg-error/10 hover:text-error" aria-label={`Remove package ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 font-sans text-[11px] font-semibold text-text-secondary">Weight (g)<input className={inputClass} name="actualWeightGrams" type="number" min="1" step="1" required /></label>
            <label className="flex flex-col gap-1.5 font-sans text-[11px] font-semibold text-text-secondary">Length (mm)<input className={inputClass} name="lengthMm" type="number" min="1" step="1" required /></label>
            <label className="flex flex-col gap-1.5 font-sans text-[11px] font-semibold text-text-secondary">Width (mm)<input className={inputClass} name="widthMm" type="number" min="1" step="1" required /></label>
            <label className="flex flex-col gap-1.5 font-sans text-[11px] font-semibold text-text-secondary">Height (mm)<input className={inputClass} name="heightMm" type="number" min="1" step="1" required /></label>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {pieces.length < 10 && (
          <button type="button" onClick={() => { setPieces((current) => [...current, nextPiece]); setNextPiece((current) => current + 1); }} className="inline-flex items-center gap-1.5 rounded-button border border-border bg-surface px-3.5 py-2.5 font-sans text-xs font-bold text-text-secondary hover:bg-surface-secondary">
            <Plus className="h-4 w-4" /> Add package
          </button>
        )}
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2.5 font-sans text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          <Scale className="h-4 w-4" /> {pending ? "Saving…" : "Save measurements"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function ReconciliationForm({ orderId }: { orderId: string }) {
  const action = recordOrderLogisticsAmount.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="mt-5 flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-2 font-sans text-xs font-bold text-text-primary">
        Confirmed actual logistics amount (₦)
        <input className={inputClass} name="actualLogisticsAmount" inputMode="decimal" placeholder="30000.00" required />
      </label>
      <label className="flex flex-col gap-2 font-sans text-xs font-bold text-text-primary">
        Logistics quote reference
        <input className={inputClass} name="logisticsQuoteReference" maxLength={120} placeholder="DHL quote or internal reference" required />
      </label>
      <p className="font-sans text-xs text-text-muted">Customs is excluded. This amount will be compared with the ₦30,000 deposit.</p>
      <button type="submit" disabled={pending} className="w-fit rounded-button bg-primary px-4 py-2.5 font-sans text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {pending ? "Reconciling…" : "Reconcile deposit"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

function SettlementForm({ orderId, status }: { orderId: string; status: "refund_due" | "top_up_due" }) {
  const action = settleOrderLogisticsAdjustment.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const label = status === "refund_due" ? "refund sent" : "top-up received";
  return (
    <form action={formAction} className="mt-5 flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-2 font-sans text-xs font-bold text-text-primary">
        Settlement reference
        <input className={inputClass} name="settlementReference" maxLength={120} placeholder="Transfer or internal reference" required />
      </label>
      <button type="submit" disabled={pending} className="w-fit rounded-button bg-success px-4 py-2.5 font-sans text-xs font-bold text-white hover:brightness-95 disabled:opacity-50">
        {pending ? "Saving…" : `Mark ${label}`}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

export function OrderLogisticsManager(props: Props) {
  const measured = Boolean(props.shipment?.packages.length);
  const due = props.reconciliationStatus === "refund_due" || props.reconciliationStatus === "top_up_due";
  const adjustmentLabel = (props.adjustmentMinor ?? 0) < 0 ? "Refund due" : "Top-up due";

  return (
    <section className="rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
      <div className="flex items-start gap-3">
        <div className="rounded-[11px] bg-primary-soft p-2.5 text-primary"><PackagePlus className="h-5 w-5" /></div>
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">Logistics reconciliation</h2>
          <p className="mt-1 font-sans text-xs leading-relaxed text-text-secondary">Physical package measurements and the final logistics amount. Customs remains separate.</p>
        </div>
      </div>

      {props.orderStatus === "paid" && <p className="mt-5 rounded-[10px] bg-warning/10 px-3.5 py-3 font-sans text-xs font-semibold text-warning">Move this order to Sourcing before recording package measurements.</p>}
      {props.orderStatus === "sourcing" && !measured && <MeasurementForm orderId={props.orderId} />}

      {measured && props.shipment && (
        <div className="mt-5 rounded-[12px] border border-border bg-background p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-sans text-xs font-bold text-text-primary">{props.shipment.publicReference} · {props.shipment.provider.toUpperCase()}</p>
            <span className="font-sans text-[11px] font-semibold text-success">Measured</span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {props.shipment.packages.map((item) => (
              <p key={item.id} className="font-sans text-xs text-text-secondary">Package {item.pieceNumber}: {item.actualWeightGrams.toLocaleString("en-NG")}g · {item.lengthMm} × {item.widthMm} × {item.heightMm}mm</p>
            ))}
          </div>
        </div>
      )}

      {measured && props.reconciliationStatus === "pending_measurement" && props.orderStatus === "sourcing" && <ReconciliationForm orderId={props.orderId} />}

      {props.actualLogisticsMinor !== null && (
        <div className="mt-5 grid grid-cols-1 gap-2 border-t border-border pt-4 font-sans text-sm sm:grid-cols-2">
          <p className="text-text-secondary">Deposit <span className="float-right font-semibold text-text-primary">{formatNaira(props.depositMinor / 100)}</span></p>
          <p className="text-text-secondary">Actual logistics <span className="float-right font-semibold text-text-primary">{formatNaira(props.actualLogisticsMinor / 100)}</span></p>
          {props.adjustmentMinor !== null && props.adjustmentMinor !== 0 && <p className="text-text-secondary sm:col-span-2">{adjustmentLabel} <span className="float-right font-semibold text-text-primary">{formatNaira(Math.abs(props.adjustmentMinor) / 100)}</span></p>}
        </div>
      )}

      {due && <SettlementForm orderId={props.orderId} status={props.reconciliationStatus as "refund_due" | "top_up_due"} />}
      {(props.reconciliationStatus === "no_adjustment" || props.reconciliationStatus === "refunded" || props.reconciliationStatus === "top_up_paid") && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-success/10 px-3.5 py-3 font-sans text-xs font-semibold text-success"><CircleCheck className="h-4 w-4" /> Logistics reconciliation settled.</p>
      )}
    </section>
  );
}
