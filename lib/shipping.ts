export const ORDER_STATUSES = [
  "pending_quote",
  "awaiting_payment",
  "paid",
  "sourcing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_quote: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["sourcing", "cancelled"],
  sourcing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  logisticsSettled: boolean,
): boolean {
  if (from === to) return true;
  if (to === "shipped" && !logisticsSettled) return false;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function availableOrderStatuses(from: OrderStatus, logisticsSettled: boolean): OrderStatus[] {
  return ORDER_STATUSES.filter((status) => canTransitionOrderStatus(from, status, logisticsSettled));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_quote: "Pending logistics",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  sourcing: "Sourcing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Each status gets its own color from the KOI token set so the orders table
// reads at a glance. The in-flight stages (paid → sourcing → shipped) use a
// deliberate light-to-dark blue progression — the deeper the blue, the closer
// to delivered — rather than three arbitrary unrelated hues.
export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending_quote: "bg-surface-secondary text-text-primary",
  awaiting_payment: "bg-warning/10 text-warning",
  paid: "bg-accent-blue/15 text-primary-hover",
  sourcing: "bg-info/10 text-info",
  shipped: "bg-primary-soft text-primary",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-error/10 text-error",
};

// Same mapping as raw hex, for contexts (charts, dots) that can't take a
// Tailwind class — e.g. recharts fill props.
export const ORDER_STATUS_HEX: Record<OrderStatus, string> = {
  pending_quote: "#8f8f88",
  awaiting_payment: "#f5a524",
  paid: "#5ba3ff",
  sourcing: "#0091ff",
  shipped: "#004aad",
  delivered: "#14ae5c",
  cancelled: "#e5484d",
};
