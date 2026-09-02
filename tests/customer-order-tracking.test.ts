import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeCustomerEmail,
  normalizeOrderReference,
  toCustomerOrderTrackingResult,
  type CustomerTrackingRecord,
} from "@/lib/customer-order-tracking";
import { trackOrderSchema } from "@/lib/schemas";

const read = (path: string) => readFileSync(path, "utf8");

const record: CustomerTrackingRecord = {
  reference: "KOI-TLKVEF",
  customerEmail: "buyer@example.com",
  status: "sourcing",
  deliveryAddress: "1 Test Street",
  deliveryCity: "Abuja",
  deliveryRegion: "FCT",
  deliveryLandmark: "Near the park",
  pricingCurrency: "NGN",
  logisticsDepositMinor: 3_000_000,
  totalMinor: 15_320_000,
  createdAt: new Date("2026-09-01T12:00:00.000Z"),
  items: [{
    title: "ACG Solar Chase",
    brandName: "Nike",
    imageUrl: "https://static.nike.com/item.jpg",
    quantity: 1,
    selectedOptions: [
      { name: "Size", value: "XXL" },
      { name: "Colour", value: "Black/Summit White" },
    ],
    sellingUnitMinor: 12_320_000,
    sourceVariantId: "a4f5faf5-1322-5f6e-9555-be9b2b915de3",
  }],
  shipment: {
    provider: "dhl",
    trackingNumber: "DHL-TEST-1",
    status: "measured",
    events: [{ status: "measured", location: "KOI hub", occurredAt: new Date("2026-09-02T09:00:00.000Z") }],
  },
};

test("tracking lookup normalizes the reference and email", () => {
  assert.equal(normalizeOrderReference("  koi-tlkvef "), "KOI-TLKVEF");
  assert.equal(normalizeCustomerEmail(" Buyer@Example.COM "), "buyer@example.com");
  assert.deepEqual(trackOrderSchema.parse({
    reference: "  koi-tlkvef ",
    email: " Buyer@Example.COM ",
  }), { reference: "koi-tlkvef", email: "Buyer@Example.COM" });
});

test("customer tracking preserves exact item and variant snapshots in minor units", () => {
  const result = toCustomerOrderTrackingResult(record);
  assert.deepEqual(result.items[0].selectedOptions, record.items[0].selectedOptions);
  assert.equal(result.items[0].sellingUnitMinor, 12_320_000);
  assert.equal(result.sellingSubtotalMinor, 12_320_000);
  assert.equal(result.logisticsDepositMinor, 3_000_000);
  assert.equal(result.totalMinor, 15_320_000);
});

test("customer tracking exposes shipment milestones without provider payloads", () => {
  const result = toCustomerOrderTrackingResult(record);
  assert.deepEqual(result.shipment, {
    provider: "dhl",
    trackingNumber: "DHL-TEST-1",
    status: "measured",
    events: [{ status: "measured", location: "KOI hub", occurredAt: "2026-09-02T09:00:00.000Z" }],
  });
  assert.doesNotMatch(JSON.stringify(result), /providerPayload|providerResponse/);
});

test("customer tracking omits private commerce and staff accounting fields", () => {
  const privateRecord = {
    ...record,
    internalNotes: "Never show this",
    acquisitionSubtotalMinor: 11_200_000,
    serviceMarginMinor: 1_120_000,
    logisticsAdjustmentMinor: -500_000,
    settlementReference: "PRIVATE-REF",
  };
  const serialized = JSON.stringify(toCustomerOrderTrackingResult(privateRecord));
  for (const privateValue of [
    "Never show this",
    "PRIVATE-REF",
    "acquisitionSubtotalMinor",
    "serviceMarginMinor",
    "a4f5faf5-1322-5f6e-9555-be9b2b915de3",
  ]) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});

test("tracking fails closed when persisted first-payment components disagree", () => {
  assert.throws(
    () => toCustomerOrderTrackingResult({ ...record, totalMinor: record.totalMinor + 1 }),
    /does not match/,
  );
});

test("tracking runtime uses PostgreSQL snapshots and not InsForge", () => {
  const route = read("app/api/orders/track/route.ts");
  const repository = read("database/repositories/customerOrderRepository.ts");
  const page = read("app/track/page.tsx");
  assert.doesNotMatch(route, /insforge/i);
  assert.match(route, /customerOrderRepository\.track/);
  assert.match(route, /private, no-store/);
  assert.match(repository, /lower\(\$\{orders\.customerEmail\}\)/);
  assert.match(repository, /orderItems\.selectedOptions/);
  assert.match(repository, /orderItems\.sourceVariantId/);
  assert.doesNotMatch(repository, /internalNotes|acquisitionUnitMinor|serviceMarginUnitMinor|providerPayload/);
  assert.match(page, /sellingSubtotalMinor/);
  assert.match(page, /logisticsDepositMinor/);
  assert.match(page, /formatCurrencyMinor/);
  assert.match(page, /CUSTOMER_ORDER_TIMELINE/);
  assert.doesNotMatch(page, /type OrderStatus\s*=/);
});
