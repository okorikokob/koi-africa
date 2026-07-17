import Link from "next/link";
import { createInsforgeServer } from "@/lib/insforge-server";
import { formatNaira } from "@/lib/currency";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import {
  ORDER_STATUS_BADGE_CLASS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/shipping";
import { avatarClass, initials } from "@/lib/admin-ui";

type OrderRow = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  delivery_city: string;
  delivery_state: string;
  total_naira: number;
  status: OrderStatus;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, q } = await searchParams;
  const insforge = createInsforgeServer();

  let query = insforge.database
    .from("orders")
    .select(
      "id, reference, customer_name, customer_email, delivery_city, delivery_state, total_naira, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.or(`reference.ilike.%${q}%,customer_email.ilike.%${q}%`);
  }

  const { data } = await query;
  const orders = (data ?? []) as OrderRow[];

  const filters: { key: string; label: string; restClass: string }[] = [
    { key: "", label: "All", restClass: "border-border bg-surface text-text-secondary" },
    ...ORDER_STATUSES.map((s) => ({
      key: s,
      label: ORDER_STATUS_LABELS[s],
      restClass: `border-transparent ${ORDER_STATUS_BADGE_CLASS[s]}`,
    })),
  ];

  return (
    <>
      <AdminTopbar title="Orders">
        <form className="flex items-center gap-2" action="/admin/orders">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search reference or email…"
            className="w-64 max-w-full rounded-button border border-border bg-surface px-4 py-2.5 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="shrink-0 rounded-button bg-primary px-4 py-2.5 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Search
          </button>
        </form>
      </AdminTopbar>

      <div className="px-9 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-sm text-text-muted">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const params = new URLSearchParams();
              if (f.key) params.set("status", f.key);
              if (q) params.set("q", q);
              const href = params.toString() ? `/admin/orders?${params.toString()}` : "/admin/orders";
              const isActive = (status ?? "") === f.key;
              return (
                <Link
                  key={f.key || "all"}
                  href={href}
                  className={`rounded-button border px-4 py-2 font-sans text-sm font-semibold transition-all ${f.restClass} ${
                    isActive
                      ? "ring-2 ring-current ring-offset-2 ring-offset-background"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto rounded-card border border-border bg-surface p-6.5 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Order", "Customer", "Location", "Amount", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border pb-3.5 pr-3.5 text-left font-sans text-[11px] font-extrabold uppercase tracking-wide text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="[&>td]:border-b [&>td]:border-border last:[&>td]:border-none hover:bg-surface-secondary"
                >
                  <td className="py-4 pr-3.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-sans text-sm font-extrabold text-text-primary hover:text-primary"
                    >
                      {order.reference}
                    </Link>
                  </td>
                  <td className="py-4 pr-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-extrabold ${avatarClass(order.customer_name)}`}
                      >
                        {initials(order.customer_name)}
                      </div>
                      <div>
                        <p className="font-sans text-sm font-medium text-text-primary">
                          {order.customer_name}
                        </p>
                        <p className="font-sans text-[11px] text-text-muted">
                          {order.customer_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-3.5 font-sans text-sm text-text-secondary">
                    {order.delivery_city}, {order.delivery_state}
                  </td>
                  <td className="py-4 pr-3.5 font-sans text-sm font-semibold text-text-primary">
                    {formatNaira(order.total_naira)}
                  </td>
                  <td className="py-4 pr-3.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-4 pr-3.5 font-sans text-sm text-text-secondary">
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-sans text-sm text-text-muted">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
