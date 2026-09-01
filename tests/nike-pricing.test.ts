import assert from "node:assert/strict";
import test from "node:test";
import { convertMinorUnits, type DisplayRateSnapshot } from "@/lib/display-currency";
import {
  calculateNikeOrderPricing,
  calculateNikeUnitPricing,
  calculatePercentageMinor,
  KOI_NIKE_LOGISTICS_DEPOSIT_MINOR,
  reconcileNikeLogistics,
} from "@/lib/nike-pricing";

const effectiveAt = "2026-09-01T00:00:00.000Z";
const snapshot: DisplayRateSnapshot = {
  anchorCurrency: "USD",
  rates: {
    USD: { rate: "1.000000000000", source: "identity", sourceReference: null, effectiveAt },
    NGN: { rate: "1600.000000000000", source: "approved", sourceReference: "pilot", effectiveAt },
    GBP: { rate: "0.787401574803", source: "approved", sourceReference: "pilot", effectiveAt },
    EUR: { rate: "0.925925925926", source: "approved", sourceReference: "pilot", effectiveAt },
  },
};

test("calculates the approved 10% Nike margin entirely in minor units", () => {
  const price = calculateNikeUnitPricing({ sourcePrice: 62.5, sourceCurrency: "USD", exchangeRateSnapshot: snapshot });
  assert.equal(price.sourceUnitPriceMinor, 6_250);
  assert.equal(price.acquisitionUnitMinor, 10_000_000);
  assert.equal(price.serviceMarginUnitMinor, 1_000_000);
  assert.equal(price.sellingUnitMinor, 11_000_000);
});
test("rounds a percentage to the nearest minor unit", () => {
  assert.equal(calculatePercentageMinor(105, 1_000), 11);
  assert.equal(calculatePercentageMinor(104, 1_000), 10);
});
test("converts the same selling price across NGN, USD, GBP, and EUR", () => {
  const price = calculateNikeUnitPricing({ sourcePrice: 62.5, sourceCurrency: "USD", exchangeRateSnapshot: snapshot });
  assert.equal(convertMinorUnits(price.sellingUnitMinor, "NGN", "NGN", snapshot), 11_000_000);
  assert.equal(convertMinorUnits(price.sellingUnitMinor, "NGN", "USD", snapshot), 6_875);
  assert.equal(convertMinorUnits(price.sellingUnitMinor, "NGN", "GBP", snapshot), 5_413);
  assert.equal(convertMinorUnits(price.sellingUnitMinor, "NGN", "EUR", snapshot), 6_366);
});
test("adds exactly one logistics deposit to a multi-item order", () => {
  const first = calculateNikeUnitPricing({ sourcePrice: 62.5, sourceCurrency: "USD", exchangeRateSnapshot: snapshot });
  const second = calculateNikeUnitPricing({ sourcePrice: 100, sourceCurrency: "USD", exchangeRateSnapshot: snapshot });
  const order = calculateNikeOrderPricing([{ ...first, quantity: 2 }, { ...second, quantity: 1 }]);
  assert.equal(order.logisticsDepositMinor, KOI_NIKE_LOGISTICS_DEPOSIT_MINOR);
  assert.equal(order.acquisitionSubtotalMinor, 36_000_000);
  assert.equal(order.serviceMarginMinor, 3_600_000);
  assert.equal(order.sellingSubtotalMinor, 39_600_000);
  assert.equal(order.firstPaymentTotalMinor, 42_600_000);
});
test("records refund, no-adjustment, and top-up reconciliation states", () => {
  assert.deepEqual(reconcileNikeLogistics(2_500_000), { actualLogisticsMinor: 2_500_000, adjustmentMinor: -500_000, status: "refund_due" });
  assert.equal(reconcileNikeLogistics(3_000_000).status, "no_adjustment");
  assert.deepEqual(reconcileNikeLogistics(3_500_000), { actualLogisticsMinor: 3_500_000, adjustmentMinor: 500_000, status: "top_up_due" });
});
