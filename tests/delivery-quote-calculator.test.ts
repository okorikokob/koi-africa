import assert from "node:assert/strict";
import test from "node:test";
import { dhlLogisticsFoundationEnabled } from "@/lib/catalog-feature-flags";
import {
  calculateEstimatedDeliveryProviderCost,
  confirmDeliveryProviderCost,
  composeDeliveryCharge,
  resolveEstimatedDeliveryMeasurements,
  type DeliveryQuoteLine,
  type DeliveryRateCard,
} from "@/lib/delivery-quote-calculator";

const rateCard: DeliveryRateCard = {
  id: "rate-dhl-us-ng",
  provider: "dhl",
  serviceName: "Business Express",
  currency: "NGN",
  minimumChargeMinor: 150_000,
  ratePerKgMinor: 200_000,
  minimumWeightGrams: 0,
  maximumWeightGrams: 30_000,
  billingIncrementGrams: 500,
  volumetricDivisorCm3PerKg: "5000.000",
  sourceReference: "test-only-rate",
};

function line(overrides: Partial<DeliveryQuoteLine> = {}): DeliveryQuoteLine {
  return {
    sourceProductId: "nike-product-1",
    sourceVariantId: "nike-variant-1",
    quantity: 1,
    weightGrams: 3_000,
    lengthMm: 100,
    widthMm: 100,
    heightMm: 100,
    measurementSource: "provider",
    measurementScope: "variant",
    ...overrides,
  };
}

test("DHL logistics foundation is disabled unless explicitly enabled", () => {
  assert.equal(dhlLogisticsFoundationEnabled({}), false);
  assert.equal(dhlLogisticsFoundationEnabled({ KOI_DHL_LOGISTICS_FOUNDATION: "false" }), false);
  assert.equal(dhlLogisticsFoundationEnabled({ KOI_DHL_LOGISTICS_FOUNDATION: "TRUE" }), false);
  assert.equal(dhlLogisticsFoundationEnabled({ KOI_DHL_LOGISTICS_FOUNDATION: "true" }), true);
});

test("uses actual weight when it is greater than volumetric weight", () => {
  const result = calculateEstimatedDeliveryProviderCost({ lines: [line()], rateCard });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.actualWeightGrams, 3_000);
  assert.equal(result.volumetricWeightGrams, 200);
  assert.equal(result.chargeableWeightGrams, 3_000);
  assert.equal(result.billedWeightGrams, 3_000);
  assert.equal(result.providerCostMinor, 600_000);
});

test("uses volumetric weight and the stored billing increment when volume is greater", () => {
  const result = calculateEstimatedDeliveryProviderCost({
    lines: [line({ weightGrams: 1_000, lengthMm: 500, widthMm: 400, heightMm: 310 })],
    rateCard,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.volumetricWeightGrams, 12_400);
  assert.equal(result.chargeableWeightGrams, 12_400);
  assert.equal(result.billedWeightGrams, 12_500);
  assert.equal(result.providerCostMinor, 2_500_000);
});

test("applies the stored minimum charge without including KOI margin", () => {
  const result = calculateEstimatedDeliveryProviderCost({
    lines: [line({ weightGrams: 100, lengthMm: 50, widthMm: 50, heightMm: 50 })],
    rateCard,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.billedWeightGrams, 500);
  assert.equal(result.providerCostMinor, 150_000);
});

test("fails closed for missing, unknown, or merely estimated measurements", () => {
  const missing = calculateEstimatedDeliveryProviderCost({
    lines: [line({ heightMm: null })],
    rateCard,
  });
  assert.deepEqual(missing.ok ? null : missing.code, "missing_measurements");

  const unknown = calculateEstimatedDeliveryProviderCost({
    lines: [line({ measurementSource: "unknown" })],
    rateCard,
  });
  assert.deepEqual(unknown.ok ? null : unknown.code, "untrusted_measurements");

  const estimated = calculateEstimatedDeliveryProviderCost({
    lines: [line({ measurementSource: "estimated" })],
    rateCard,
  });
  assert.deepEqual(estimated.ok ? null : estimated.code, "untrusted_measurements");
});

test("confirmed cost preserves the official provider quote across physical package pieces", () => {
  const confirmed = confirmDeliveryProviderCost({
    packages: [
      {
        shipmentPackageId: "package-1",
        pieceNumber: 1,
        weightGrams: 2_000,
        lengthMm: 400,
        widthMm: 300,
        heightMm: 200,
        measurementSource: "measured",
      },
      {
        shipmentPackageId: "package-2",
        pieceNumber: 2,
        weightGrams: 1_500,
        lengthMm: 250,
        widthMm: 200,
        heightMm: 150,
        measurementSource: "measured",
      },
    ],
    providerQuote: {
      provider: "dhl",
      serviceName: "Business Express",
      currency: "NGN",
      providerCostMinor: 4_250_000,
      sourceReference: "DHL-OFFICIAL-QUOTE-1",
      volumetricWeightGrams: 6_300,
      chargeableWeightGrams: 6_300,
      billedWeightGrams: 6_500,
    },
  });
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.equal(confirmed.actualWeightGrams, 3_500);
  assert.equal(confirmed.providerCostMinor, 4_250_000);
  assert.equal(confirmed.calculationSnapshot.formulaVersion, "provider-confirmation-v1");
  assert.equal(confirmed.calculationSnapshot.packages.length, 2);
});

test("confirmed cost rejects unmeasured pieces and missing official quote identity", () => {
  const shipmentPackage = {
    pieceNumber: 1,
    weightGrams: 2_000,
    lengthMm: 400,
    widthMm: 300,
    heightMm: 200,
    measurementSource: "provider" as const,
  };
  const providerQuote = {
    provider: "dhl",
    serviceName: "Business Express",
    currency: "NGN",
    providerCostMinor: 4_250_000,
    sourceReference: "DHL-OFFICIAL-QUOTE-1",
    volumetricWeightGrams: 4_800,
    chargeableWeightGrams: 4_800,
    billedWeightGrams: 5_000,
  };
  const unmeasured = confirmDeliveryProviderCost({ packages: [shipmentPackage], providerQuote });
  assert.deepEqual(unmeasured.ok ? null : unmeasured.code, "confirmed_measurement_required");

  const unidentified = confirmDeliveryProviderCost({
    packages: [{ ...shipmentPackage, measurementSource: "measured" }],
    providerQuote: { ...providerQuote, sourceReference: "" },
  });
  assert.deepEqual(unidentified.ok ? null : unidentified.code, "confirmed_provider_quote_required");
});

test("rejects a shipment above the stored DHL service weight limit", () => {
  const result = calculateEstimatedDeliveryProviderCost({
    lines: [line({ quantity: 11 })],
    rateCard,
  });
  assert.deepEqual(result.ok ? null : result.code, "maximum_weight_exceeded");
});

test("rejects a rate card whose maximum weight is not above its minimum", () => {
  for (const maximumWeightGrams of [1_000, 999]) {
    const result = calculateEstimatedDeliveryProviderCost({
      lines: [line()],
      rateCard: { ...rateCard, minimumWeightGrams: 1_000, maximumWeightGrams },
    });
    assert.deepEqual(result.ok ? null : result.code, "invalid_rate_card");
  }
});

test("uses complete trusted variant measurements before product measurements", () => {
  const product = {
    weightGrams: 2_000,
    lengthMm: 300,
    widthMm: 200,
    heightMm: 100,
    measurementSource: "provider" as const,
  };
  const variant = {
    weightGrams: 2_500,
    lengthMm: 320,
    widthMm: 220,
    heightMm: 120,
    measurementSource: "provider" as const,
  };
  assert.deepEqual(resolveEstimatedDeliveryMeasurements({ product, variant }), {
    ...variant,
    measurementScope: "variant",
  });
  assert.deepEqual(resolveEstimatedDeliveryMeasurements({
    product,
    variant: { ...variant, heightMm: null },
  }), {
    ...product,
    measurementScope: "product",
  });
});

test("keeps provider cost, KOI logistics margin, local delivery, and Customs separate", () => {
  assert.deepEqual(composeDeliveryCharge({
    currency: "NGN",
    providerCostMinor: 3_500_000,
    logisticsMarginMinor: 1_000_000,
    localDeliveryMinor: 1_000_000,
    customsDutyMinor: 2_500_000,
  }), {
    currency: "NGN",
    providerCostMinor: 3_500_000,
    logisticsMarginMinor: 1_000_000,
    localDeliveryMinor: 1_000_000,
    deliveryTotalMinor: 5_500_000,
    customsDutyMinor: 2_500_000,
    customerTotalIncludingKnownCustomsMinor: 8_000_000,
  });
});
