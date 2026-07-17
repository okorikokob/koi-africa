import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/shipping";

type Props = {
  status: OrderStatus;
};

export function OrderStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-xs font-extrabold tracking-wide ${ORDER_STATUS_BADGE_CLASS[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
