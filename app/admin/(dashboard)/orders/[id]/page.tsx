import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { adminOrderRepository } from "@/database/repositories/adminOrderRepository";
import { formatNaira } from "@/lib/currency";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";
import { OrderNotesEditor } from "@/components/admin/OrderNotesEditor";
import { OrderLogisticsManager } from "@/components/admin/OrderLogisticsManager";
import { availableOrderStatuses } from "@/lib/shipping";
import { isLogisticsReconciliationSettled, type LogisticsReconciliationStatus } from "@/lib/admin-logistics";

type Props = { params: Promise<{ id: string }> };
const naira = (minor: number) => formatNaira(minor / 100);

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await adminOrderRepository.getById(id);
  if (!order) notFound();
  const sellingSubtotalMinor = order.acquisitionSubtotalMinor + order.marginMinor;
  const reconciliationStatus = order.reconciliationStatus as LogisticsReconciliationStatus;
  const logisticsSettled = isLogisticsReconciliationSettled(reconciliationStatus);

  return (
    <>
      <AdminTopbar title={`Orders / ${order.reference}`} />
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to orders
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black text-text-primary">{order.reference}</h1>
            <p className="mt-1 font-sans text-sm text-text-secondary">Placed {order.createdAt.toLocaleDateString("en-NG", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">Items</h2>
              <div className="mt-4 flex flex-col gap-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                      {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-semibold text-text-primary">{item.title}</p>
                      <p className="font-sans text-xs text-text-muted">{item.vendorName} · Qty {item.quantity}</p>
                      {item.selectedOptions.length > 0 && <p className="font-sans text-xs text-text-secondary">{item.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}</p>}
                      <p className="font-mono text-[10px] text-text-muted">Source variant {item.sourceVariantId ?? "—"}</p>
                    </div>
                    <p className="shrink-0 font-sans text-sm font-semibold text-text-primary">{naira(item.sellingUnitMinor * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 font-sans text-sm">
                <div className="flex justify-between text-text-secondary"><span>Acquisition subtotal</span><span>{naira(order.acquisitionSubtotalMinor)}</span></div>
                <div className="flex justify-between text-text-secondary"><span>KOI margin (embedded)</span><span>{naira(order.marginMinor)}</span></div>
                <div className="flex justify-between text-text-secondary"><span>Selling subtotal</span><span>{naira(sellingSubtotalMinor)}</span></div>
                <div className="flex justify-between text-text-secondary"><span>Logistics deposit</span><span>{naira(order.logisticsDepositMinor)}</span></div>
                <div className="flex justify-between text-text-secondary"><span>Customs</span><span>{naira(order.customsTotalMinor)}</span></div>
                <div className="flex justify-between font-semibold text-text-primary"><span>First payment total</span><span>{naira(order.totalMinor)}</span></div>
                <p className="pt-1 text-xs text-text-muted">Logistics reconciliation: {order.reconciliationStatus.replaceAll("_", " ")}</p>
              </div>
            </section>
            <section className="rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">Delivery address</h2>
              <p className="mt-3 flex items-start gap-2 font-sans text-sm text-text-secondary">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{order.deliveryAddress}, {order.deliveryCity}, {order.deliveryRegion}{order.deliveryLandmark ? ` — ${order.deliveryLandmark}` : ""}</span>
              </p>
            </section>
            <section className="rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">Internal notes</h2>
              <p className="mt-1 font-sans text-xs text-text-muted">Staff only — never shown to the customer.</p>
              <div className="mt-3"><OrderNotesEditor orderId={order.id} initialNotes={order.internalNotes ?? ""} /></div>
            </section>
            <OrderLogisticsManager
              orderId={order.id}
              orderStatus={order.status}
              depositMinor={order.logisticsDepositMinor}
              actualLogisticsMinor={order.actualLogisticsMinor}
              adjustmentMinor={order.logisticsAdjustmentMinor}
              reconciliationStatus={reconciliationStatus}
              shipment={order.shipment}
            />
          </div>
          <div className="flex flex-col gap-6">
            <section className="rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">Customer</h2>
              <p className="mt-3 font-sans text-sm font-semibold text-text-primary">{order.customerName}</p>
              <p className="mt-2 flex items-center gap-2 font-sans text-sm text-text-secondary"><Mail className="h-4 w-4" />{order.customerEmail}</p>
              <p className="mt-2 flex items-center gap-2 font-sans text-sm text-text-secondary"><Phone className="h-4 w-4" />{order.customerPhone}</p>
              {order.paymentReference && <p className="mt-3 font-sans text-xs text-text-muted">Paystack ref: {order.paymentReference}</p>}
            </section>
            <section className="rounded-card border border-primary/25 bg-primary-soft/50 p-4.5 shadow-sm sm:p-6.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary">Update status</h2>
              <div className="mt-3"><OrderStatusUpdater orderId={order.id} currentStatus={order.status} availableStatuses={availableOrderStatuses(order.status, logisticsSettled)} /></div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
