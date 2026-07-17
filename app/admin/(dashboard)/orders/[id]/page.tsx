import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { createInsforgeServer } from "@/lib/insforge-server";
import { formatNaira } from "@/lib/currency";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";
import { OrderNotesEditor } from "@/components/admin/OrderNotesEditor";
import type { OrderStatus } from "@/lib/shipping";

type OrderDetailRow = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  landmark: string | null;
  status: OrderStatus;
  subtotal_naira: number;
  delivery_fee_naira: number;
  total_naira: number;
  payment_reference: string | null;
  internal_notes: string | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  title: string;
  vendor_name: string;
  price_paid: number;
  quantity: number;
  product_id: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const insforge = createInsforgeServer();

  const { data: order } = await insforge.database
    .from("orders")
    .select(
      "id, reference, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_state, landmark, status, subtotal_naira, delivery_fee_naira, total_naira, payment_reference, internal_notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const row = order as OrderDetailRow;

  const { data: itemRows } = await insforge.database
    .from("order_items")
    .select("id, title, vendor_name, price_paid, quantity, product_id")
    .eq("order_id", row.id);

  const items = (itemRows ?? []) as OrderItemRow[];
  const productIds = items.map((i) => i.product_id).filter((v): v is string => Boolean(v));

  const imageByProductId = new Map<string, string | null>();
  if (productIds.length > 0) {
    const { data: products } = await insforge.database
      .from("products")
      .select("id, image_url")
      .in("id", productIds);
    for (const p of (products ?? []) as Array<{ id: string; image_url: string | null }>) {
      imageByProductId.set(p.id, p.image_url);
    }
  }

  return (
    <>
      <AdminTopbar title={`Orders / ${row.reference}`} />
      <div className="px-9 py-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-text-primary">
            {row.reference}
          </h1>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Placed{" "}
            {new Date(row.created_at).toLocaleDateString("en-NG", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={row.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
              Items
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                    {item.product_id && imageByProductId.get(item.product_id) && (
                      <Image
                        src={imageByProductId.get(item.product_id)!}
                        alt={item.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold text-text-primary">
                      {item.title}
                    </p>
                    <p className="font-sans text-xs text-text-muted">
                      {item.vendor_name} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-sans text-sm font-semibold text-text-primary">
                    {formatNaira(item.price_paid * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 font-sans text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatNaira(row.subtotal_naira)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Delivery fee</span>
                <span>{formatNaira(row.delivery_fee_naira)}</span>
              </div>
              <div className="flex justify-between font-semibold text-text-primary">
                <span>Total paid</span>
                <span>{formatNaira(row.total_naira)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
              Delivery address
            </h2>
            <p className="mt-3 flex items-start gap-2 font-sans text-sm text-text-secondary">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                {row.delivery_address}, {row.delivery_city}, {row.delivery_state}
                {row.landmark ? ` — ${row.landmark}` : ""}
              </span>
            </p>
          </div>

          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
              Internal notes
            </h2>
            <p className="mt-1 font-sans text-xs text-text-muted">
              Staff only — never shown to the customer.
            </p>
            <div className="mt-3">
              <OrderNotesEditor orderId={row.id} initialNotes={row.internal_notes ?? ""} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
              Customer
            </h2>
            <p className="mt-3 font-sans text-sm font-semibold text-text-primary">
              {row.customer_name}
            </p>
            <p className="mt-2 flex items-center gap-2 font-sans text-sm text-text-secondary">
              <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {row.customer_email}
            </p>
            <p className="mt-2 flex items-center gap-2 font-sans text-sm text-text-secondary">
              <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {row.customer_phone}
            </p>
            {row.payment_reference && (
              <p className="mt-3 font-sans text-xs text-text-muted">
                Paystack ref: {row.payment_reference}
              </p>
            )}
          </div>

          <div className="rounded-card border border-primary/25 bg-primary-soft/50 p-6.5 shadow-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary">
              Update status
            </h2>
            <div className="mt-3">
              <OrderStatusUpdater orderId={row.id} currentStatus={row.status} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
