import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencyCode, timestamps } from "@/database/schema/common";
import { measurementSource, products, productVariants } from "@/database/schema/catalog";

export const shippingQuoteStatus = pgEnum("shipping_quote_status", [
  "pending",
  "quoted",
  "accepted",
  "expired",
  "cancelled",
]);

export const shippingQuoteStage = pgEnum("shipping_quote_stage", [
  "estimated",
  "confirmed",
]);

export const customsAssessmentStatus = pgEnum("customs_assessment_status", [
  "unknown",
  "estimated",
  "confirmed",
  "paid",
  "waived",
]);

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull(),
  regionCode: text("region_code"),
  city: text("city"),
  postalCodePattern: text("postal_code_pattern"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
}, (table) => [
  uniqueIndex("shipping_zones_location_uidx").on(
    table.name,
    table.countryCode,
    table.regionCode,
    table.city,
  ),
]);

export const shippingRateCards = pgTable("shipping_rate_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  serviceName: text("service_name").notNull(),
  originZoneId: uuid("origin_zone_id").references(() => shippingZones.id, { onDelete: "restrict" }),
  destinationZoneId: uuid("destination_zone_id").notNull().references(() => shippingZones.id, { onDelete: "restrict" }),
  currency: currencyCode("currency").notNull(),
  minimumChargeMinor: bigint("minimum_charge_minor", { mode: "number" }).notNull().default(0),
  ratePerKgMinor: bigint("rate_per_kg_minor", { mode: "number" }).notNull(),
  minimumWeightGrams: integer("minimum_weight_grams").notNull().default(0),
  maximumWeightGrams: integer("maximum_weight_grams"),
  billingIncrementGrams: integer("billing_increment_grams").notNull().default(1000),
  volumetricDivisorCm3PerKg: numeric("volumetric_divisor_cm3_per_kg", { precision: 12, scale: 3 }).notNull(),
  sourceReference: text("source_reference"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
}, (table) => [
  index("shipping_rate_cards_lookup_idx").on(
    table.destinationZoneId,
    table.isActive,
    table.effectiveFrom,
  ),
  check("shipping_rate_cards_amounts_nonnegative", sql`${table.minimumChargeMinor} >= 0 and ${table.ratePerKgMinor} >= 0`),
  check("shipping_rate_cards_weights_valid", sql`${table.minimumWeightGrams} >= 0 and (${table.maximumWeightGrams} is null or ${table.maximumWeightGrams} > ${table.minimumWeightGrams})`),
  check("shipping_rate_cards_billing_increment_positive", sql`${table.billingIncrementGrams} > 0`),
  check("shipping_rate_cards_divisor_positive", sql`${table.volumetricDivisorCm3PerKg} > 0`),
]);

export const shippingQuotes = pgTable("shipping_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicReference: text("public_reference").notNull().unique(),
  status: shippingQuoteStatus("status").notNull().default("pending"),
  stage: shippingQuoteStage("stage").notNull().default("estimated"),
  destinationZoneId: uuid("destination_zone_id").references(() => shippingZones.id, { onDelete: "set null" }),
  rateCardId: uuid("rate_card_id").references(() => shippingRateCards.id, { onDelete: "set null" }),
  destinationCountryCode: text("destination_country_code").notNull(),
  destinationRegion: text("destination_region"),
  destinationCity: text("destination_city"),
  actualWeightGrams: integer("actual_weight_grams"),
  volumetricWeightGrams: integer("volumetric_weight_grams"),
  chargeableWeightGrams: integer("chargeable_weight_grams"),
  billedWeightGrams: integer("billed_weight_grams"),
  measurementSource: measurementSource("measurement_source"),
  currency: currencyCode("currency"),
  providerCostMinor: bigint("provider_cost_minor", { mode: "number" }),
  logisticsMarginMinor: bigint("logistics_margin_minor", { mode: "number" }),
  localDeliveryMinor: bigint("local_delivery_minor", { mode: "number" }),
  amountMinor: bigint("amount_minor", { mode: "number" }),
  customsStatus: customsAssessmentStatus("customs_status").notNull().default("unknown"),
  customsDutyMinor: bigint("customs_duty_minor", { mode: "number" }),
  calculationSnapshot: jsonb("calculation_snapshot").$type<Record<string, unknown>>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  index("shipping_quotes_status_created_idx").on(table.status, table.createdAt),
  check("shipping_quotes_weights_nonnegative", sql`(${table.actualWeightGrams} is null or ${table.actualWeightGrams} >= 0)
    and (${table.volumetricWeightGrams} is null or ${table.volumetricWeightGrams} >= 0)
    and (${table.chargeableWeightGrams} is null or ${table.chargeableWeightGrams} >= 0)
    and (${table.billedWeightGrams} is null or ${table.billedWeightGrams} >= 0)`),
  check("shipping_quotes_amounts_nonnegative", sql`(${table.providerCostMinor} is null or ${table.providerCostMinor} >= 0)
    and (${table.logisticsMarginMinor} is null or ${table.logisticsMarginMinor} >= 0)
    and (${table.localDeliveryMinor} is null or ${table.localDeliveryMinor} >= 0)
    and (${table.amountMinor} is null or ${table.amountMinor} >= 0)
    and (${table.customsDutyMinor} is null or ${table.customsDutyMinor} >= 0)`),
  check("shipping_quotes_delivery_total_matches", sql`${table.amountMinor} is null
    or (${table.providerCostMinor} is not null
      and ${table.logisticsMarginMinor} is not null
      and ${table.localDeliveryMinor} is not null
      and ${table.amountMinor} = ${table.providerCostMinor} + ${table.logisticsMarginMinor} + ${table.localDeliveryMinor})`),
]);

export const shippingQuoteItems = pgTable("shipping_quote_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shippingQuoteId: uuid("shipping_quote_id").notNull().references(() => shippingQuotes.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sourceProductId: text("source_product_id").notNull(),
  sourceVariantId: text("source_variant_id"),
  quantity: integer("quantity").notNull(),
  unitWeightGrams: integer("unit_weight_grams"),
  lengthMm: integer("length_mm"),
  widthMm: integer("width_mm"),
  heightMm: integer("height_mm"),
  measurementSource: measurementSource("measurement_source").notNull().default("unknown"),
  ...timestamps(),
}, (table) => [
  index("shipping_quote_items_quote_idx").on(table.shippingQuoteId),
  check("shipping_quote_items_quantity_positive", sql`${table.quantity} > 0`),
]);
