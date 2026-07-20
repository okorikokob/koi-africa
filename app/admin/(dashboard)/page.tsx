import Link from "next/link";
import { Banknote, Package, Sparkles, Clock3 } from "lucide-react";
import { createInsforgeServer } from "@/lib/insforge-server";
import { formatNaira } from "@/lib/currency";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { KpiCard } from "@/components/admin/KpiCard";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { RevenueBarChart } from "@/components/admin/charts/RevenueBarChart";
import { CategoryDonutChart } from "@/components/admin/charts/CategoryDonutChart";
import type { OrderStatus } from "@/lib/shipping";
import { avatarClass, initials } from "@/lib/admin-ui";

type OrderRow = {
  id: string;
  reference: string;
  customer_name: string;
  total_naira: number;
  status: OrderStatus;
  created_at: string;
};

type OrderItemRow = { price_paid: number; quantity: number; product_id: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_STATUSES: OrderStatus[] = ["submitted", "awaiting_payment", "paid", "sourcing"];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function getReportWindow() {
  const now = Date.now();
  return {
    now,
    since60: new Date(now - 60 * DAY_MS).toISOString(),
    since30: new Date(now - 30 * DAY_MS).toISOString(),
  };
}

export default async function AdminDashboardPage() {
  const insforge = createInsforgeServer();
  const { now, since60, since30 } = getReportWindow();

  const { data: orderData } = await insforge.database
    .from("orders")
    .select("id, reference, customer_name, total_naira, status, created_at")
    .gte("created_at", since60)
    .order("created_at", { ascending: false });

  const orders = (orderData ?? []) as OrderRow[];

  const last30 = orders.filter((o) => o.created_at >= since30);
  const prev30 = orders.filter((o) => o.created_at < since30);

  const revenue30 = last30.reduce((sum, o) => sum + o.total_naira, 0);
  const revenuePrev = prev30.reduce((sum, o) => sum + o.total_naira, 0);

  const { data: allOrdersForPending } = await insforge.database
    .from("orders")
    .select("status");
  const pendingCount = ((allOrdersForPending ?? []) as { status: OrderStatus }[]).filter((o) =>
    PENDING_STATUSES.includes(o.status),
  ).length;

  const { data: brandRows } = await insforge.database.from("products").select("brand_name");
  const activeBrands = new Set(
    ((brandRows ?? []) as { brand_name: string | null }[])
      .map((b) => b.brand_name)
      .filter((b): b is string => Boolean(b)),
  ).size;

  const last7Days: string[] = Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(now - (6 - i) * DAY_MS).toISOString()),
  );
  const revenueByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();
  for (const o of orders) {
    const key = dayKey(o.created_at);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + o.total_naira);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }
  const revenueSpark = last7Days.map((d) => revenueByDay.get(d) ?? 0);
  const orderSpark = last7Days.map((d) => countByDay.get(d) ?? 0);
  const pendingSpark = last7Days.map((d) => countByDay.get(d) ?? 0);

  const weeks: { label: string; total: number }[] = Array.from({ length: 7 }, (_, i) => {
    const weekStart = now - (6 - i) * 7 * DAY_MS;
    const weekEnd = weekStart + 7 * DAY_MS;
    const total = orders
      .filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= weekStart && t < weekEnd;
      })
      .reduce((sum, o) => sum + o.total_naira, 0);
    return { label: `Wk ${i + 1}`, total };
  });

  const orderIds = orders.map((o) => o.id);
  const { data: itemRows } =
    orderIds.length > 0
      ? await insforge.database
          .from("order_items")
          .select("price_paid, quantity, product_id")
          .in("order_id", orderIds)
      : { data: [] };
  const items = (itemRows ?? []) as OrderItemRow[];
  const productIds = items.map((i) => i.product_id).filter((v): v is string => Boolean(v));

  const categoryByProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: productRows } = await insforge.database
      .from("products")
      .select("id, category")
      .in("id", productIds);
    for (const p of (productRows ?? []) as { id: string; category: string | null }[]) {
      categoryByProduct.set(p.id, p.category ?? "Other");
    }
  }

  const revenueByCategory = new Map<string, number>();
  for (const item of items) {
    const category = item.product_id ? (categoryByProduct.get(item.product_id) ?? "Other") : "Other";
    revenueByCategory.set(
      category,
      (revenueByCategory.get(category) ?? 0) + item.price_paid * item.quantity,
    );
  }
  const totalCategoryRevenue = [...revenueByCategory.values()].reduce((a, b) => a + b, 0);
  const categorySplit = [...revenueByCategory.entries()]
    .map(([name, revenue]) => ({
      name,
      pct: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 5);

  return (
    <>
      <AdminTopbar title="Dashboard" />
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          <KpiCard
            label="Revenue (30d)"
            value={formatNaira(revenue30)}
            icon={Banknote}
            accent="primary"
            trendPct={pctChange(revenue30, revenuePrev)}
            trendLabel="vs prior 30d"
            spark={revenueSpark}
          />
          <KpiCard
            label="Orders (30d)"
            value={last30.length.toLocaleString("en-NG")}
            icon={Package}
            accent="info"
            trendPct={pctChange(last30.length, prev30.length)}
            trendLabel="vs prior 30d"
            spark={orderSpark}
          />
          <KpiCard
            label="Active brands"
            value={activeBrands.toLocaleString("en-NG")}
            icon={Sparkles}
            accent="success"
            trendPct={null}
            trendLabel=""
            spark={[activeBrands, activeBrands, activeBrands, activeBrands, activeBrands, activeBrands, activeBrands]}
          />
          <KpiCard
            label="Orders needing action"
            value={pendingCount.toLocaleString("en-NG")}
            icon={Clock3}
            accent="warning"
            trendPct={null}
            trendLabel=""
            spark={pendingSpark}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm lg:col-span-2">
            <div className="mb-5">
              <p className="font-display text-base font-extrabold text-text-primary">
                Revenue overview
              </p>
              <p className="mt-0.5 font-sans text-xs text-text-muted">
                Naira revenue, last 7 weeks
              </p>
            </div>
            <RevenueBarChart data={weeks} />
          </div>

          <div className="rounded-card border border-border bg-surface p-6.5 shadow-sm">
            <div className="mb-5">
              <p className="font-display text-base font-extrabold text-text-primary">
                Sales by category
              </p>
              <p className="mt-0.5 font-sans text-xs text-text-muted">Share of revenue</p>
            </div>
            {categorySplit.length === 0 ? (
              <p className="font-sans text-sm text-text-muted">No sales data yet.</p>
            ) : (
              <CategoryDonutChart data={categorySplit} />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-display text-base font-extrabold text-text-primary">
                Recent orders
              </p>
              <p className="mt-0.5 font-sans text-xs text-text-muted">Latest activity</p>
            </div>
            <Link
              href="/admin/orders"
              className="font-sans text-[13px] font-bold text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-border sm:hidden">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-extrabold ${avatarClass(o.customer_name)}`}
                >
                  {initials(o.customer_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-sm font-extrabold text-text-primary">
                    {o.reference}
                  </p>
                  <p className="truncate font-sans text-xs text-text-muted">{o.customer_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-sans text-sm font-semibold text-text-primary">
                    {formatNaira(o.total_naira)}
                  </p>
                  <div className="mt-1">
                    <OrderStatusBadge status={o.status} />
                  </div>
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && (
              <p className="py-10 text-center font-sans text-sm text-text-muted">No orders yet.</p>
            )}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Order", "Customer", "Amount", "Status", "Date"].map((h) => (
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
                {recentOrders.map((o) => (
                  <tr key={o.id} className="[&>td]:border-b [&>td]:border-border last:[&>td]:border-none">
                    <td className="py-4 pr-3.5">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-sans text-sm font-extrabold text-text-primary hover:text-primary"
                      >
                        {o.reference}
                      </Link>
                    </td>
                    <td className="py-4 pr-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-extrabold ${avatarClass(o.customer_name)}`}
                        >
                          {initials(o.customer_name)}
                        </div>
                        <p className="font-sans text-sm text-text-primary">{o.customer_name}</p>
                      </div>
                    </td>
                    <td className="py-4 pr-3.5 font-sans text-sm font-semibold text-text-primary">
                      {formatNaira(o.total_naira)}
                    </td>
                    <td className="py-4 pr-3.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-4 pr-3.5 font-sans text-sm text-text-secondary">
                      {new Date(o.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-sans text-sm text-text-muted">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
