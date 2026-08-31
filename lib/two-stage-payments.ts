export type ServiceFeePolicy = {
  id: string;
  currency: string;
  percentageBasisPoints: number;
  minimumFeeMinor: number;
  maximumFeeMinor: number | null;
  approvalReference: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  isActive: boolean;
};

export type ServiceFeeCalculationResult = {
  ok: true;
  currency: string;
  productSubtotalMinor: number;
  serviceFeeMinor: number;
  productPaymentTotalMinor: number;
  snapshot: {
    policyId: string;
    approvalReference: string;
    percentageBasisPoints: number;
    minimumFeeMinor: number;
    maximumFeeMinor: number | null;
    effectiveAt: string;
  };
} | {
  ok: false;
  code: "invalid_subtotal" | "inactive_policy" | "invalid_policy" | "unsafe_calculation";
  message: string;
};

type OrderStatus =
  | "pending_quote"
  | "awaiting_payment"
  | "paid"
  | "sourcing"
  | "shipped"
  | "delivered"
  | "cancelled";

type ShipmentStatus =
  | "awaiting_product"
  | "received_at_hub"
  | "measured"
  | "quoted"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "customs_hold"
  | "customs_cleared"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "return_requested"
  | "returning"
  | "returned"
  | "cancelled";

type PaymentStatus = "pending" | "success" | "failed" | "refunded";

export function orderCanRequestProductPayment(status: OrderStatus): boolean {
  return status === "pending_quote" || status === "awaiting_payment";
}

export function orderCanRequestDeliveryPayment(status: OrderStatus): boolean {
  return status === "paid" || status === "sourcing";
}

export function shipmentCanRequestDeliveryPayment(status: ShipmentStatus): boolean {
  return status === "quoted" || status === "booked";
}

export function paymentStatusCanBeReconciled(status: PaymentStatus): boolean {
  return status === "pending" || status === "failed";
}

export function successfulPaymentMatchesRequestSnapshot(input: {
  request: {
    id: string;
    orderId: string;
    purpose: "product_and_service" | "delivery";
    currency: string;
    amountMinor: number;
  };
  payment: {
    paymentRequestId: string | null;
    orderId: string;
    purpose: "product_and_service" | "delivery";
    status: PaymentStatus;
    currency: string;
    expectedAmountMinor: number;
    verifiedAmountMinor: number | null;
    verifiedAt: Date | null;
  };
  currency: string;
  verifiedAmountMinor: number;
}): boolean {
  return input.payment.status === "success"
    && input.payment.paymentRequestId === input.request.id
    && input.payment.orderId === input.request.orderId
    && input.payment.purpose === input.request.purpose
    && input.payment.currency.trim().toUpperCase() === input.request.currency.trim().toUpperCase()
    && input.payment.currency.trim().toUpperCase() === input.currency.trim().toUpperCase()
    && input.payment.expectedAmountMinor === input.request.amountMinor
    && input.payment.verifiedAmountMinor === input.request.amountMinor
    && input.payment.verifiedAt !== null
    && Number.isFinite(input.payment.verifiedAt.getTime())
    && input.verifiedAmountMinor === input.request.amountMinor
    && nonnegativeSafeInteger(input.verifiedAmountMinor);
}

function nonnegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function calculateServiceFee(input: {
  productSubtotalMinor: number;
  currency: string;
  policy: ServiceFeePolicy;
  effectiveAt: Date;
}): ServiceFeeCalculationResult {
  if (!nonnegativeSafeInteger(input.productSubtotalMinor)) {
    return { ok: false, code: "invalid_subtotal", message: "The product subtotal is invalid." };
  }
  const effectiveAt = input.effectiveAt.getTime();
  if (
    !input.policy.isActive
    || !Number.isFinite(effectiveAt)
    || effectiveAt < input.policy.effectiveFrom.getTime()
    || (input.policy.effectiveUntil !== null && effectiveAt >= input.policy.effectiveUntil.getTime())
  ) {
    return { ok: false, code: "inactive_policy", message: "No approved service-fee policy is effective." };
  }
  if (
    input.currency.trim().toUpperCase() !== input.policy.currency.trim().toUpperCase()
    || input.policy.currency.trim().length !== 3
    || !Number.isInteger(input.policy.percentageBasisPoints)
    || input.policy.percentageBasisPoints < 0
    || input.policy.percentageBasisPoints > 10_000
    || !nonnegativeSafeInteger(input.policy.minimumFeeMinor)
    || (input.policy.maximumFeeMinor !== null && (
      !nonnegativeSafeInteger(input.policy.maximumFeeMinor)
      || input.policy.maximumFeeMinor < input.policy.minimumFeeMinor
    ))
    || !input.policy.approvalReference.trim()
  ) {
    return { ok: false, code: "invalid_policy", message: "The service-fee policy is invalid." };
  }

  const percentageFee = (
    BigInt(input.productSubtotalMinor) * BigInt(input.policy.percentageBasisPoints) + BigInt(5_000)
  ) / BigInt(10_000);
  let serviceFee = percentageFee > BigInt(input.policy.minimumFeeMinor)
    ? percentageFee
    : BigInt(input.policy.minimumFeeMinor);
  if (input.policy.maximumFeeMinor !== null && serviceFee > BigInt(input.policy.maximumFeeMinor)) {
    serviceFee = BigInt(input.policy.maximumFeeMinor);
  }
  const productPaymentTotal = BigInt(input.productSubtotalMinor) + serviceFee;
  const serviceFeeMinor = Number(serviceFee);
  const productPaymentTotalMinor = Number(productPaymentTotal);
  if (!Number.isSafeInteger(serviceFeeMinor) || !Number.isSafeInteger(productPaymentTotalMinor)) {
    return { ok: false, code: "unsafe_calculation", message: "The service-fee calculation exceeds safe limits." };
  }

  return {
    ok: true,
    currency: input.policy.currency.toUpperCase(),
    productSubtotalMinor: input.productSubtotalMinor,
    serviceFeeMinor,
    productPaymentTotalMinor,
    snapshot: {
      policyId: input.policy.id,
      approvalReference: input.policy.approvalReference,
      percentageBasisPoints: input.policy.percentageBasisPoints,
      minimumFeeMinor: input.policy.minimumFeeMinor,
      maximumFeeMinor: input.policy.maximumFeeMinor,
      effectiveAt: input.effectiveAt.toISOString(),
    },
  };
}

export function paymentMatchesRequest(input: {
  request: {
    status: "pending" | "paid" | "expired" | "cancelled";
    currency: string;
    amountMinor: number;
    expiresAt: Date | null;
  };
  currency: string;
  verifiedAmountMinor: number;
  verifiedAt: Date;
}): boolean {
  return input.request.status === "pending"
    && input.request.currency.trim().toUpperCase() === input.currency.trim().toUpperCase()
    && input.request.amountMinor === input.verifiedAmountMinor
    && nonnegativeSafeInteger(input.verifiedAmountMinor)
    && Number.isFinite(input.verifiedAt.getTime())
    && (input.request.expiresAt === null || input.verifiedAt < input.request.expiresAt);
}
