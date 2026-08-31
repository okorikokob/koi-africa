import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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
import { adminUsers } from "@/database/schema/admin";
import { currencyCode, timestamps } from "@/database/schema/common";
import { products, productVariants } from "@/database/schema/catalog";
import { shippingQuotes } from "@/database/schema/shipping";

export const orderStatus = pgEnum("order_status", [
  "pending_quote",
  "awaiting_payment",
  "paid",
  "sourcing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "refunded",
]);

export const paymentPurpose = pgEnum("payment_purpose", [
  "product_and_service",
  "delivery",
]);

export const paymentRequestStatus = pgEnum("payment_request_status", [
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const serviceFeePolicies = pgTable("service_fee_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: currencyCode("currency").notNull(),
  categoryKey: text("category_key"),
  percentageBasisPoints: integer("percentage_basis_points").notNull(),
  minimumFeeMinor: bigint("minimum_fee_minor", { mode: "number" }).notNull().default(0),
  maximumFeeMinor: bigint("maximum_fee_minor", { mode: "number" }),
  approvalReference: text("approval_reference").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(false),
  ...timestamps(),
}, (table) => [
  index("service_fee_policies_lookup_idx").on(table.currency, table.categoryKey, table.isActive),
  check("service_fee_policies_percentage_valid", sql`${table.percentageBasisPoints} >= 0 and ${table.percentageBasisPoints} <= 10000`),
  check("service_fee_policies_amounts_valid", sql`${table.minimumFeeMinor} >= 0
    and (${table.maximumFeeMinor} is null or ${table.maximumFeeMinor} >= ${table.minimumFeeMinor})`),
  check("service_fee_policies_effective_range_valid", sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`),
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: text("delivery_city").notNull(),
  deliveryRegion: text("delivery_region").notNull(),
  deliveryCountryCode: text("delivery_country_code").notNull().default("NG"),
  deliveryLandmark: text("delivery_landmark"),
  pricingCurrency: currencyCode("pricing_currency").notNull(),
  displayCurrency: currencyCode("display_currency").notNull(),
  productSubtotalMinor: bigint("product_subtotal_minor", { mode: "number" }).notNull(),
  serviceFeePolicyId: uuid("service_fee_policy_id").references(() => serviceFeePolicies.id, { onDelete: "set null" }),
  serviceFeeMinor: bigint("service_fee_minor", { mode: "number" }).notNull().default(0),
  shippingTotalMinor: bigint("shipping_total_minor", { mode: "number" }).notNull(),
  customsTotalMinor: bigint("customs_total_minor", { mode: "number" }).notNull().default(0),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
  exchangeRateSnapshot: jsonb("exchange_rate_snapshot").$type<{
    baseCurrency: string;
    quoteCurrency: string;
    rate: string;
    source: string;
    effectiveAt: string;
  }>(),
  shippingQuoteId: uuid("shipping_quote_id").references(() => shippingQuotes.id, { onDelete: "set null" }),
  status: orderStatus("status").notNull().default("pending_quote"),
  internalNotes: text("internal_notes"),
  ...timestamps(),
}, (table) => [
  index("orders_customer_email_idx").on(table.customerEmail),
  index("orders_status_created_idx").on(table.status, table.createdAt),
  check("orders_amounts_nonnegative", sql`${table.productSubtotalMinor} >= 0
    and ${table.serviceFeeMinor} >= 0
    and ${table.shippingTotalMinor} >= 0
    and ${table.customsTotalMinor} >= 0
    and ${table.totalMinor} >= 0`),
  check("orders_total_matches_parts", sql`${table.totalMinor} = ${table.productSubtotalMinor} + ${table.serviceFeeMinor} + ${table.shippingTotalMinor} + ${table.customsTotalMinor}`),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sourceProductId: text("source_product_id").notNull(),
  sourceVariantId: text("source_variant_id"),
  sku: text("sku"),
  gtin: text("gtin"),
  title: text("title").notNull(),
  brandName: text("brand_name").notNull(),
  imageUrl: text("image_url"),
  vendorName: text("vendor_name").notNull(),
  vendorUrl: text("vendor_url").notNull(),
  selectedOptions: jsonb("selected_options").$type<Array<{ name: string; value: string }>>().notNull().default([]),
  currency: currencyCode("currency").notNull(),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  quantity: integer("quantity").notNull(),
  weightGramsSnapshot: integer("weight_grams_snapshot"),
  dimensionsMmSnapshot: jsonb("dimensions_mm_snapshot").$type<{ length: number; width: number; height: number }>(),
  ...timestamps(),
}, (table) => [
  index("order_items_order_idx").on(table.orderId),
  check("order_items_unit_price_nonnegative", sql`${table.unitPriceMinor} >= 0`),
  check("order_items_quantity_positive", sql`${table.quantity} > 0`),
]);

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicReference: text("public_reference").notNull().unique(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  shippingQuoteId: uuid("shipping_quote_id").references(() => shippingQuotes.id, { onDelete: "restrict" }),
  purpose: paymentPurpose("purpose").notNull(),
  status: paymentRequestStatus("status").notNull().default("pending"),
  currency: currencyCode("currency").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  pricingSnapshot: jsonb("pricing_snapshot").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  index("payment_requests_order_purpose_idx").on(table.orderId, table.purpose, table.status),
  index("payment_requests_quote_idx").on(table.shippingQuoteId),
  check("payment_requests_amount_nonnegative", sql`${table.amountMinor} >= 0`),
  check("payment_requests_delivery_quote_required", sql`${table.purpose} <> 'delivery' or ${table.shippingQuoteId} is not null`),
  check("payment_requests_product_quote_forbidden", sql`${table.purpose} <> 'product_and_service' or ${table.shippingQuoteId} is null`),
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  paymentRequestId: uuid("payment_request_id").references(() => paymentRequests.id, { onDelete: "restrict" }),
  purpose: paymentPurpose("purpose").notNull().default("product_and_service"),
  provider: text("provider").notNull().default("paystack"),
  providerReference: text("provider_reference").notNull(),
  currency: currencyCode("currency").notNull(),
  expectedAmountMinor: bigint("expected_amount_minor", { mode: "number" }).notNull(),
  verifiedAmountMinor: bigint("verified_amount_minor", { mode: "number" }),
  status: paymentStatus("status").notNull().default("pending"),
  channel: text("channel"),
  providerResponse: jsonb("provider_response").$type<Record<string, unknown>>(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("payments_provider_reference_uidx").on(table.provider, table.providerReference),
  index("payments_order_idx").on(table.orderId),
  index("payments_request_idx").on(table.paymentRequestId),
  check("payments_expected_amount_nonnegative", sql`${table.expectedAmountMinor} >= 0`),
  check("payments_verified_amount_nonnegative", sql`${table.verifiedAmountMinor} is null or ${table.verifiedAmountMinor} >= 0`),
]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatus("from_status"),
  toStatus: orderStatus("to_status").notNull(),
  changedByAdminId: uuid("changed_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("order_status_history_order_created_idx").on(table.orderId, table.createdAt)]);
