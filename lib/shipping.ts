export const ORDER_STATUSES = [
  "submitted",
  "awaiting_payment",
  "paid",
  "sourcing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
