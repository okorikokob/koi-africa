import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  exchangeRates,
  catalogSyncRunProducts,
  orderItems,
  orders,
  payments,
  paymentRequests,
  productColourways,
  productImages,
  productVariants,
  products,
  shippingQuotes,
  shippingQuotePackages,
  shippingRateCards,
  shipmentCustomsCharges,
  shipments,
  serviceFeePolicies,
  shipmentPackages,
  shipmentTrackingEvents,
} from "@/database/schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

test("catalogue money retains an amount and ISO currency without assuming naira", () => {
  assert.ok(columnNames(products).includes("price_minor"));
  assert.ok(columnNames(products).includes("currency"));
  assert.ok(columnNames(productVariants).includes("price_minor"));
  assert.ok(columnNames(productVariants).includes("currency"));
});

test("verified colourways own their images and exact variants by stable identity", () => {
  assert.deepEqual(
    ["product_id", "style_color", "colour", "primary_image_url", "price_minor", "availability_status"]
      .filter((name) => !columnNames(productColourways).includes(name)),
    [],
  );
  assert.ok(columnNames(productImages).includes("colourway_id"));
  assert.ok(columnNames(productVariants).includes("colourway_id"));
});

test("catalogue sync lineage supports authoritative reconciliation without deleting products", () => {
  assert.deepEqual(
    ["sync_run_id", "product_id", "observed_source_product_id", "canonical_url", "observed_at"]
      .filter((name) => !columnNames(catalogSyncRunProducts).includes(name)),
    [],
  );
  assert.deepEqual(
    [
      "last_seen_sync_run_id",
      "missing_since_sync_run_id",
      "deactivated_by_sync_run_id",
      "deactivated_at",
      "deactivation_reason",
    ].filter((name) => !columnNames(products).includes(name)),
    [],
  );
});

test("products and variants can hold shipping measurements independently", () => {
  const required = ["weight_grams", "length_mm", "width_mm", "height_mm", "measurement_source"];
  assert.deepEqual(required.filter((name) => !columnNames(products).includes(name)), []);
  assert.deepEqual(required.filter((name) => !columnNames(productVariants).includes(name)), []);
});

test("exchange rates are historical records and orders retain pricing snapshots", () => {
  assert.deepEqual(
    ["base_currency", "quote_currency", "rate", "source", "effective_at"].filter(
      (name) => !columnNames(exchangeRates).includes(name),
    ),
    [],
  );
  assert.ok(columnNames(orders).includes("exchange_rate_snapshot"));
  assert.ok(columnNames(orders).includes("display_currency"));
  assert.ok(columnNames(orders).includes("pricing_currency"));
});

test("shipping is quote and rate-card based rather than a percentage of product value", () => {
  assert.ok(columnNames(shippingRateCards).includes("rate_per_kg_minor"));
  assert.ok(columnNames(shippingRateCards).includes("volumetric_divisor_cm3_per_kg"));
  assert.ok(columnNames(shippingQuotes).includes("chargeable_weight_grams"));
  assert.ok(columnNames(shippingQuotes).includes("calculation_snapshot"));
  assert.ok(columnNames(shippingRateCards).includes("billing_increment_grams"));
  assert.ok(columnNames(shippingQuotes).includes("provider_cost_minor"));
  assert.ok(columnNames(shippingQuotes).includes("logistics_margin_minor"));
  assert.ok(columnNames(shippingQuotes).includes("local_delivery_minor"));
  assert.ok(columnNames(shippingQuotes).includes("customs_duty_minor"));
});

test("DHL operations can record tracking, Customs, restrictions, and customer-paid returns", () => {
  assert.ok(columnNames(shipments).includes("tracking_number"));
  assert.ok(columnNames(shipments).includes("restriction_status"));
  assert.ok(columnNames(shipments).includes("return_shipping_payer"));
  assert.ok(columnNames(shipmentTrackingEvents).includes("provider_event_id"));
  assert.ok(columnNames(shipmentCustomsCharges).includes("pricing_amount_minor"));
  assert.ok(columnNames(shipmentCustomsCharges).includes("payer"));
  assert.deepEqual(
    ["shipment_id", "piece_number", "actual_weight_grams", "length_mm", "width_mm", "height_mm"]
      .filter((name) => !columnNames(shipmentPackages).includes(name)),
    [],
  );
  assert.deepEqual(
    ["shipping_quote_id", "shipment_package_id", "piece_number", "actual_weight_grams"]
      .filter((name) => !columnNames(shippingQuotePackages).includes(name)),
    [],
  );
});

test("commerce records use immutable snapshots and provider idempotency", () => {
  assert.ok(columnNames(orderItems).includes("source_product_id"));
  assert.ok(columnNames(orderItems).includes("unit_price_minor"));
  assert.ok(columnNames(payments).includes("provider_reference"));
  assert.ok(columnNames(payments).includes("expected_amount_minor"));
  assert.ok(columnNames(payments).includes("verified_amount_minor"));
  assert.ok(columnNames(payments).includes("payment_request_id"));
  assert.ok(columnNames(payments).includes("purpose"));
  assert.ok(columnNames(orders).includes("service_fee_minor"));
  assert.deepEqual(
    ["order_id", "shipping_quote_id", "purpose", "amount_minor", "pricing_snapshot"]
      .filter((name) => !columnNames(paymentRequests).includes(name)),
    [],
  );
  assert.ok(columnNames(serviceFeePolicies).includes("percentage_basis_points"));
  assert.ok(columnNames(serviceFeePolicies).includes("approval_reference"));
  assert.ok(columnNames(shipments).includes("delivery_payment_request_id"));
});
