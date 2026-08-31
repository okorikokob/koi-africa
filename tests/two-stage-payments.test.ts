import assert from "node:assert/strict";
import test from "node:test";
import { twoStagePaymentsEnabled } from "@/lib/catalog-feature-flags";
import { shipmentStatusRequiresDeliveryPayment } from "@/lib/shipment-lifecycle";
import {
  calculateServiceFee,
  orderCanRequestDeliveryPayment,
  orderCanRequestProductPayment,
  paymentMatchesRequest,
  paymentStatusCanBeReconciled,
  shipmentCanRequestDeliveryPayment,
  successfulPaymentMatchesRequestSnapshot,
} from "@/lib/two-stage-payments";

const effectiveAt = new Date("2026-08-25T10:00:00.000Z");
const examplePolicy = {
  id: "test-policy",
  currency: "NGN",
  percentageBasisPoints: 1_500,
  minimumFeeMinor: 1_000_000,
  maximumFeeMinor: null,
  approvalReference: "TEST-ONLY-NOT-A-BUSINESS-APPROVAL",
  effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
  effectiveUntil: null,
  isActive: true,
};

test("two-stage payments remain disabled unless explicitly enabled", () => {
  assert.equal(twoStagePaymentsEnabled({}), false);
  assert.equal(twoStagePaymentsEnabled({ KOI_TWO_STAGE_PAYMENTS: "false" }), false);
  assert.equal(twoStagePaymentsEnabled({ KOI_TWO_STAGE_PAYMENTS: "TRUE" }), false);
  assert.equal(twoStagePaymentsEnabled({ KOI_TWO_STAGE_PAYMENTS: "true" }), true);
});

test("calculates the boss's example from an explicit policy without including delivery", () => {
  const result = calculateServiceFee({
    productSubtotalMinor: 50_000_000,
    currency: "NGN",
    policy: examplePolicy,
    effectiveAt,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.serviceFeeMinor, 7_500_000);
  assert.equal(result.productPaymentTotalMinor, 57_500_000);
});

test("fails closed without an active, approved, currency-matched service-fee policy", () => {
  const inactive = calculateServiceFee({
    productSubtotalMinor: 50_000_000,
    currency: "NGN",
    policy: { ...examplePolicy, isActive: false },
    effectiveAt,
  });
  assert.deepEqual(inactive.ok ? null : inactive.code, "inactive_policy");

  const unapproved = calculateServiceFee({
    productSubtotalMinor: 50_000_000,
    currency: "NGN",
    policy: { ...examplePolicy, approvalReference: "" },
    effectiveAt,
  });
  assert.deepEqual(unapproved.ok ? null : unapproved.code, "invalid_policy");

  const wrongCurrency = calculateServiceFee({
    productSubtotalMinor: 50_000_000,
    currency: "USD",
    policy: examplePolicy,
    effectiveAt,
  });
  assert.deepEqual(wrongCurrency.ok ? null : wrongCurrency.code, "invalid_policy");
});

test("verified payment must exactly match a pending, unexpired request", () => {
  const request = {
    status: "pending" as const,
    currency: "NGN",
    amountMinor: 57_500_000,
    expiresAt: new Date("2026-08-25T11:00:00.000Z"),
  };
  assert.equal(paymentMatchesRequest({
    request,
    currency: "NGN",
    verifiedAmountMinor: 57_500_000,
    verifiedAt: new Date("2026-08-25T10:30:00.000Z"),
  }), true);
  assert.equal(paymentMatchesRequest({
    request,
    currency: "NGN",
    verifiedAmountMinor: 57_499_999,
    verifiedAt: new Date("2026-08-25T10:30:00.000Z"),
  }), false);
  assert.equal(paymentMatchesRequest({
    request,
    currency: "NGN",
    verifiedAmountMinor: 57_500_000,
    verifiedAt: request.expiresAt,
  }), false);
});

test("delivery payment is required only when physical dispatch begins", () => {
  assert.equal(shipmentStatusRequiresDeliveryPayment("quoted"), false);
  assert.equal(shipmentStatusRequiresDeliveryPayment("booked"), false);
  assert.equal(shipmentStatusRequiresDeliveryPayment("picked_up"), true);
  assert.equal(shipmentStatusRequiresDeliveryPayment("in_transit"), true);
  assert.equal(shipmentStatusRequiresDeliveryPayment("delivered"), true);
});

test("payment requests are limited to safe order and shipment stages", () => {
  assert.equal(orderCanRequestProductPayment("pending_quote"), true);
  assert.equal(orderCanRequestProductPayment("awaiting_payment"), true);
  assert.equal(orderCanRequestProductPayment("paid"), false);
  assert.equal(orderCanRequestProductPayment("delivered"), false);
  assert.equal(orderCanRequestProductPayment("cancelled"), false);

  assert.equal(orderCanRequestDeliveryPayment("paid"), true);
  assert.equal(orderCanRequestDeliveryPayment("sourcing"), true);
  assert.equal(orderCanRequestDeliveryPayment("shipped"), false);
  assert.equal(orderCanRequestDeliveryPayment("delivered"), false);
  assert.equal(orderCanRequestDeliveryPayment("cancelled"), false);

  assert.equal(shipmentCanRequestDeliveryPayment("quoted"), true);
  assert.equal(shipmentCanRequestDeliveryPayment("booked"), true);
  assert.equal(shipmentCanRequestDeliveryPayment("picked_up"), false);
  assert.equal(shipmentCanRequestDeliveryPayment("in_transit"), false);
  assert.equal(shipmentCanRequestDeliveryPayment("delivered"), false);
  assert.equal(shipmentCanRequestDeliveryPayment("cancelled"), false);
});

test("only pending and failed provider attempts can be reconciled", () => {
  assert.equal(paymentStatusCanBeReconciled("pending"), true);
  assert.equal(paymentStatusCanBeReconciled("failed"), true);
  assert.equal(paymentStatusCanBeReconciled("success"), false);
  assert.equal(paymentStatusCanBeReconciled("refunded"), false);
});

test("successful payment replay must exactly match its immutable request snapshot", () => {
  const request = {
    id: "request-1",
    orderId: "order-1",
    purpose: "product_and_service" as const,
    currency: "NGN",
    amountMinor: 57_500_000,
  };
  const payment = {
    paymentRequestId: request.id,
    orderId: request.orderId,
    purpose: request.purpose,
    status: "success" as const,
    currency: request.currency,
    expectedAmountMinor: request.amountMinor,
    verifiedAmountMinor: request.amountMinor,
    verifiedAt: effectiveAt,
  };
  assert.equal(successfulPaymentMatchesRequestSnapshot({
    request,
    payment,
    currency: "NGN",
    verifiedAmountMinor: request.amountMinor,
  }), true);
  assert.equal(successfulPaymentMatchesRequestSnapshot({
    request,
    payment,
    currency: "NGN",
    verifiedAmountMinor: request.amountMinor - 1,
  }), false);
  assert.equal(successfulPaymentMatchesRequestSnapshot({
    request,
    payment: { ...payment, purpose: "delivery" },
    currency: "NGN",
    verifiedAmountMinor: request.amountMinor,
  }), false);
  assert.equal(successfulPaymentMatchesRequestSnapshot({
    request,
    payment: { ...payment, status: "pending" },
    currency: "NGN",
    verifiedAmountMinor: request.amountMinor,
  }), false);
  assert.equal(successfulPaymentMatchesRequestSnapshot({
    request,
    payment: { ...payment, verifiedAt: null },
    currency: "NGN",
    verifiedAmountMinor: request.amountMinor,
  }), false);
});
