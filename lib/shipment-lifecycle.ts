export const SHIPMENT_STATUSES = [
  "awaiting_product",
  "received_at_hub",
  "measured",
  "quoted",
  "booked",
  "picked_up",
  "in_transit",
  "customs_hold",
  "customs_cleared",
  "out_for_delivery",
  "delivered",
  "exception",
  "return_requested",
  "returning",
  "returned",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

const FORWARD_STAGE: Partial<Record<ShipmentStatus, number>> = {
  awaiting_product: 0,
  received_at_hub: 1,
  measured: 2,
  quoted: 3,
  booked: 4,
  picked_up: 5,
  in_transit: 6,
  customs_hold: 7,
  customs_cleared: 8,
  out_for_delivery: 9,
  delivered: 10,
};

export function canTransitionShipmentStatus(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return true;
  if (from === "returned" || from === "cancelled") return false;
  if (to === "cancelled") return from !== "delivered" && from !== "returning";
  if (to === "return_requested") {
    return from === "in_transit"
      || from === "customs_hold"
      || from === "customs_cleared"
      || from === "out_for_delivery"
      || from === "delivered"
      || from === "exception";
  }
  if (from === "return_requested") return to === "returning" || to === "delivered";
  if (from === "returning") return to === "returned" || to === "exception";
  if (from === "exception") {
    return to !== "awaiting_product" && to !== "received_at_hub" && to !== "measured" && to !== "quoted";
  }
  if (to === "exception") return true;
  if (from === "customs_hold" && to === "in_transit") return true;

  const fromStage = FORWARD_STAGE[from];
  const toStage = FORWARD_STAGE[to];
  return fromStage !== undefined && toStage !== undefined && toStage > fromStage;
}

export function shipmentStatusRequiresRestrictionApproval(status: ShipmentStatus): boolean {
  const stage = FORWARD_STAGE[status];
  return stage !== undefined && stage >= (FORWARD_STAGE.booked ?? 4);
}

export function shipmentStatusRequiresConfirmedQuote(status: ShipmentStatus): boolean {
  const stage = FORWARD_STAGE[status];
  return stage !== undefined && stage >= (FORWARD_STAGE.booked ?? 4);
}

export function shipmentStatusRequiresDeliveryPayment(status: ShipmentStatus): boolean {
  const stage = FORWARD_STAGE[status];
  return stage !== undefined && stage >= (FORWARD_STAGE.picked_up ?? 5);
}

export type ShipmentQuoteState = {
  stage: "estimated" | "confirmed";
  status: "pending" | "quoted" | "accepted" | "expired" | "cancelled";
  confirmedAt: Date | null;
  expiresAt: Date | null;
};

export function isConfirmedShippingQuote(quote: ShipmentQuoteState | null): boolean {
  return quote?.stage === "confirmed"
    && quote.confirmedAt !== null
    && quote.status !== "pending"
    && quote.status !== "cancelled";
}

export function isBookableConfirmedShippingQuote(
  quote: ShipmentQuoteState | null,
  bookingOccurredAt: Date,
): boolean {
  return isConfirmedShippingQuote(quote)
    && (quote?.status === "quoted" || quote?.status === "accepted")
    && (quote.expiresAt === null || quote.expiresAt > bookingOccurredAt);
}

export function isChronologicalShipmentEvent(input: {
  occurredAt: Date;
  latestOccurredAt: Date | null;
  confirmedAt?: Date | null;
}): boolean {
  const occurredAt = input.occurredAt.getTime();
  const latestOccurredAt = input.latestOccurredAt?.getTime() ?? null;
  const confirmedAt = input.confirmedAt?.getTime() ?? null;
  return Number.isFinite(occurredAt)
    && (latestOccurredAt === null || occurredAt >= latestOccurredAt)
    && (confirmedAt === null || occurredAt >= confirmedAt);
}

export function confirmedQuoteMatchesShipment(input: {
  shipmentProvider: string;
  shipmentDestinationCountryCode: string;
  quoteProvider: string;
  quoteDestinationCountryCode: string;
}): boolean {
  return input.shipmentProvider.trim().toLowerCase() === input.quoteProvider.trim().toLowerCase()
    && input.shipmentDestinationCountryCode.trim().toUpperCase()
      === input.quoteDestinationCountryCode.trim().toUpperCase();
}
