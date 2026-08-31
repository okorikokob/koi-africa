import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { measurementSource, products, productVariants } from "@/database/schema/catalog";
import { orderItems, orders, paymentRequests } from "@/database/schema/commerce";
import { currencyCode, timestamps } from "@/database/schema/common";
import { shippingQuotes } from "@/database/schema/shipping";

export const shipmentStatus = pgEnum("shipment_status", [
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
]);

export const shippingRestrictionStatus = pgEnum("shipping_restriction_status", [
  "pending_review",
  "eligible",
  "restricted",
  "manual_review",
]);

export const customsChargeStatus = pgEnum("customs_charge_status", [
  "reported",
  "confirmed",
  "paid",
  "waived",
  "disputed",
]);

export const chargePayer = pgEnum("charge_payer", ["customer", "koi"]);

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicReference: text("public_reference").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  shippingQuoteId: uuid("shipping_quote_id").references(() => shippingQuotes.id, { onDelete: "set null" }),
  deliveryPaymentRequestId: uuid("delivery_payment_request_id").references(() => paymentRequests.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  providerAccountReference: text("provider_account_reference"),
  providerShipmentId: text("provider_shipment_id"),
  trackingNumber: text("tracking_number"),
  status: shipmentStatus("status").notNull().default("awaiting_product"),
  restrictionStatus: shippingRestrictionStatus("restriction_status").notNull().default("pending_review"),
  restrictionReason: text("restriction_reason"),
  originCountryCode: text("origin_country_code").notNull(),
  destinationCountryCode: text("destination_country_code").notNull().default("NG"),
  actualWeightGrams: integer("actual_weight_grams"),
  lengthMm: integer("length_mm"),
  widthMm: integer("width_mm"),
  heightMm: integer("height_mm"),
  measurementSource: measurementSource("measurement_source").notNull().default("unknown"),
  measuredAt: timestamp("measured_at", { withTimezone: true }),
  returnShippingPayer: chargePayer("return_shipping_payer").notNull().default("customer"),
  returnShippingCurrency: currencyCode("return_shipping_currency"),
  returnShippingMinor: bigint("return_shipping_minor", { mode: "number" }),
  bookedAt: timestamp("booked_at", { withTimezone: true }),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("shipments_provider_shipment_uidx").on(table.provider, table.providerShipmentId),
  index("shipments_order_idx").on(table.orderId),
  index("shipments_delivery_payment_request_idx").on(table.deliveryPaymentRequestId),
  index("shipments_tracking_idx").on(table.trackingNumber),
  index("shipments_status_updated_idx").on(table.status, table.updatedAt),
  check("shipments_measurements_positive", sql`(${table.actualWeightGrams} is null or ${table.actualWeightGrams} > 0)
    and (${table.lengthMm} is null or ${table.lengthMm} > 0)
    and (${table.widthMm} is null or ${table.widthMm} > 0)
    and (${table.heightMm} is null or ${table.heightMm} > 0)`),
  check("shipments_return_amount_nonnegative", sql`${table.returnShippingMinor} is null or ${table.returnShippingMinor} >= 0`),
]);

export const shipmentPackages = pgTable("shipment_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  pieceNumber: integer("piece_number").notNull(),
  providerPieceId: text("provider_piece_id"),
  actualWeightGrams: integer("actual_weight_grams").notNull(),
  lengthMm: integer("length_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  heightMm: integer("height_mm").notNull(),
  measurementSource: measurementSource("measurement_source").notNull().default("measured"),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
  ...timestamps(),
}, (table) => [
  uniqueIndex("shipment_packages_piece_uidx").on(table.shipmentId, table.pieceNumber),
  index("shipment_packages_shipment_idx").on(table.shipmentId),
  check("shipment_packages_measurements_positive", sql`${table.pieceNumber} > 0
    and ${table.actualWeightGrams} > 0
    and ${table.lengthMm} > 0
    and ${table.widthMm} > 0
    and ${table.heightMm} > 0`),
  check("shipment_packages_source_measured", sql`${table.measurementSource} = 'measured'`),
]);

export const shippingQuotePackages = pgTable("shipping_quote_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  shippingQuoteId: uuid("shipping_quote_id").notNull().references(() => shippingQuotes.id, { onDelete: "cascade" }),
  shipmentPackageId: uuid("shipment_package_id").references(() => shipmentPackages.id, { onDelete: "set null" }),
  pieceNumber: integer("piece_number").notNull(),
  providerPieceId: text("provider_piece_id"),
  actualWeightGrams: integer("actual_weight_grams").notNull(),
  lengthMm: integer("length_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  heightMm: integer("height_mm").notNull(),
  measurementSource: measurementSource("measurement_source").notNull().default("measured"),
  ...timestamps(),
}, (table) => [
  uniqueIndex("shipping_quote_packages_piece_uidx").on(table.shippingQuoteId, table.pieceNumber),
  index("shipping_quote_packages_quote_idx").on(table.shippingQuoteId),
  check("shipping_quote_packages_measurements_positive", sql`${table.pieceNumber} > 0
    and ${table.actualWeightGrams} > 0
    and ${table.lengthMm} > 0
    and ${table.widthMm} > 0
    and ${table.heightMm} > 0`),
  check("shipping_quote_packages_source_measured", sql`${table.measurementSource} = 'measured'`),
]);

export const shipmentItems = pgTable("shipment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sourceProductId: text("source_product_id").notNull(),
  sourceVariantId: text("source_variant_id"),
  quantity: integer("quantity").notNull(),
  ...timestamps(),
}, (table) => [
  index("shipment_items_shipment_idx").on(table.shipmentId),
  check("shipment_items_quantity_positive", sql`${table.quantity} > 0`),
]);

export const shipmentTrackingEvents = pgTable("shipment_tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  providerEventId: text("provider_event_id"),
  status: shipmentStatus("status").notNull(),
  providerStatus: text("provider_status"),
  description: text("description"),
  location: text("location"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("shipment_tracking_provider_event_uidx").on(table.shipmentId, table.providerEventId),
  index("shipment_tracking_occurred_idx").on(table.shipmentId, table.occurredAt),
]);

export const shipmentCustomsCharges = pgTable("shipment_customs_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  status: customsChargeStatus("status").notNull().default("reported"),
  payer: chargePayer("payer").notNull().default("customer"),
  authority: text("authority"),
  chargeReference: text("charge_reference"),
  description: text("description").notNull(),
  sourceCurrency: currencyCode("source_currency").notNull(),
  sourceAmountMinor: bigint("source_amount_minor", { mode: "number" }).notNull(),
  pricingCurrency: currencyCode("pricing_currency").notNull(),
  pricingAmountMinor: bigint("pricing_amount_minor", { mode: "number" }).notNull(),
  exchangeRateSnapshot: jsonb("exchange_rate_snapshot").$type<Record<string, unknown>>(),
  incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  index("shipment_customs_shipment_status_idx").on(table.shipmentId, table.status),
  check("shipment_customs_amounts_nonnegative", sql`${table.sourceAmountMinor} >= 0 and ${table.pricingAmountMinor} >= 0`),
]);
