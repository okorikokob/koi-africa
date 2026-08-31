import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionShipmentStatus,
  confirmedQuoteMatchesShipment,
  isBookableConfirmedShippingQuote,
  isChronologicalShipmentEvent,
  isConfirmedShippingQuote,
  shipmentStatusRequiresConfirmedQuote,
  shipmentStatusRequiresRestrictionApproval,
} from "@/lib/shipment-lifecycle";

test("shipment lifecycle allows forward DHL progress and Customs release", () => {
  assert.equal(canTransitionShipmentStatus("awaiting_product", "received_at_hub"), true);
  assert.equal(canTransitionShipmentStatus("received_at_hub", "measured"), true);
  assert.equal(canTransitionShipmentStatus("booked", "in_transit"), true);
  assert.equal(canTransitionShipmentStatus("customs_hold", "customs_cleared"), true);
  assert.equal(canTransitionShipmentStatus("customs_hold", "in_transit"), true);
  assert.equal(canTransitionShipmentStatus("out_for_delivery", "delivered"), true);
});

test("shipment lifecycle prevents impossible reopening of terminal shipments", () => {
  assert.equal(canTransitionShipmentStatus("returned", "in_transit"), false);
  assert.equal(canTransitionShipmentStatus("cancelled", "booked"), false);
  assert.equal(canTransitionShipmentStatus("delivered", "cancelled"), false);
});

test("returns are explicit and remain customer-payable in the database foundation", () => {
  assert.equal(canTransitionShipmentStatus("delivered", "return_requested"), true);
  assert.equal(canTransitionShipmentStatus("return_requested", "returning"), true);
  assert.equal(canTransitionShipmentStatus("returning", "returned"), true);
});

test("booking and later movement require a completed restriction review", () => {
  assert.equal(shipmentStatusRequiresRestrictionApproval("quoted"), false);
  assert.equal(shipmentStatusRequiresRestrictionApproval("booked"), true);
  assert.equal(shipmentStatusRequiresRestrictionApproval("in_transit"), true);
  assert.equal(shipmentStatusRequiresRestrictionApproval("delivered"), true);
});

test("booking and later movement require a live confirmed quote", () => {
  assert.equal(shipmentStatusRequiresConfirmedQuote("quoted"), false);
  assert.equal(shipmentStatusRequiresConfirmedQuote("booked"), true);
  assert.equal(shipmentStatusRequiresConfirmedQuote("delivered"), true);
  const confirmedAt = new Date("2026-08-25T10:00:00.000Z");
  const expiresAt = new Date("2026-08-25T10:30:00.000Z");
  const quote = { stage: "confirmed" as const, status: "quoted" as const, confirmedAt, expiresAt };
  assert.equal(isBookableConfirmedShippingQuote(quote, new Date("2026-08-25T10:15:00.000Z")), true);
  assert.equal(isBookableConfirmedShippingQuote(quote, expiresAt), false);
  assert.equal(isConfirmedShippingQuote({ ...quote, status: "expired" }), true);
  assert.equal(isConfirmedShippingQuote({ ...quote, status: "cancelled" }), false);
  assert.equal(isConfirmedShippingQuote({ ...quote, stage: "estimated" }), false);
  assert.equal(isBookableConfirmedShippingQuote(null, confirmedAt), false);
});

test("confirmed quote identity must match shipment provider and destination", () => {
  assert.equal(confirmedQuoteMatchesShipment({
    shipmentProvider: "DHL",
    shipmentDestinationCountryCode: "ng",
    quoteProvider: "dhl",
    quoteDestinationCountryCode: "NG",
  }), true);
  assert.equal(confirmedQuoteMatchesShipment({
    shipmentProvider: "dhl",
    shipmentDestinationCountryCode: "NG",
    quoteProvider: "fedex",
    quoteDestinationCountryCode: "NG",
  }), false);
  assert.equal(confirmedQuoteMatchesShipment({
    shipmentProvider: "dhl",
    shipmentDestinationCountryCode: "NG",
    quoteProvider: "dhl",
    quoteDestinationCountryCode: "GB",
  }), false);
});

test("shipment events cannot predate prior events or quote confirmation", () => {
  const latestOccurredAt = new Date("2026-08-25T10:00:00.000Z");
  const confirmedAt = new Date("2026-08-25T10:05:00.000Z");
  assert.equal(isChronologicalShipmentEvent({
    occurredAt: new Date("2026-08-25T10:06:00.000Z"),
    latestOccurredAt,
    confirmedAt,
  }), true);
  assert.equal(isChronologicalShipmentEvent({
    occurredAt: new Date("2026-08-25T09:59:00.000Z"),
    latestOccurredAt,
  }), false);
  assert.equal(isChronologicalShipmentEvent({
    occurredAt: new Date("2026-08-25T10:04:00.000Z"),
    latestOccurredAt,
    confirmedAt,
  }), false);
});
