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
import { currencyCode, timestamps } from "@/database/schema/common";

export const availabilityStatus = pgEnum("availability_status", [
  "in_stock",
  "limited",
  "pre_order",
  "out_of_stock",
  "unknown",
]);

export const measurementSource = pgEnum("measurement_source", [
  "provider",
  "measured",
  "estimated",
  "unknown",
]);

export const syncRunStatus = pgEnum("sync_run_status", [
  "running",
  "succeeded",
  "partial",
  "failed",
]);

export const priorityRefreshStatus = pgEnum("priority_refresh_status", [
  "starting",
  "running",
  "succeeded",
  "failed",
]);

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  officialDomain: text("official_domain"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
});

export const storefronts = pgTable("storefronts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  sourceStorefrontId: text("source_storefront_id").notNull(),
  countryCode: text("country_code").notNull(),
  locale: text("locale").notNull(),
  currency: currencyCode("currency").notNull(),
  officialBaseUrl: text("official_base_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
}, (table) => [
  uniqueIndex("storefronts_provider_source_uidx").on(table.provider, table.sourceStorefrontId),
  uniqueIndex("storefronts_brand_provider_region_uidx").on(
    table.brandId,
    table.provider,
    table.countryCode,
    table.locale,
  ),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storefrontId: uuid("storefront_id").notNull().references(() => storefronts.id, { onDelete: "restrict" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  sourceProductId: text("source_product_id").notNull(),
  styleCode: text("style_code"),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  productType: text("product_type"),
  department: text("department"),
  gender: text("gender"),
  currency: currencyCode("currency").notNull(),
  priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
  compareAtPriceMinor: bigint("compare_at_price_minor", { mode: "number" }),
  available: boolean("available").notNull().default(true),
  availabilityStatus: availabilityStatus("availability_status").notNull().default("in_stock"),
  isActive: boolean("is_active").notNull().default(true),
  weightGrams: integer("weight_grams"),
  lengthMm: integer("length_mm"),
  widthMm: integer("width_mm"),
  heightMm: integer("height_mm"),
  measurementSource: measurementSource("measurement_source").notNull().default("unknown"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  lastSeenSyncRunId: uuid("last_seen_sync_run_id").references(() => catalogSyncRuns.id, { onDelete: "set null" }),
  missingSinceSyncRunId: uuid("missing_since_sync_run_id").references(() => catalogSyncRuns.id, { onDelete: "set null" }),
  deactivatedBySyncRunId: uuid("deactivated_by_sync_run_id").references(() => catalogSyncRuns.id, { onDelete: "set null" }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deactivationReason: text("deactivation_reason"),
  ...timestamps(),
}, (table) => [
  uniqueIndex("products_provider_storefront_source_uidx").on(
    table.provider,
    table.storefrontId,
    table.sourceProductId,
  ),
  uniqueIndex("products_storefront_canonical_url_uidx").on(table.storefrontId, table.canonicalUrl),
  index("products_storefront_active_idx").on(table.storefrontId, table.isActive, table.available),
  index("products_last_seen_sync_run_idx").on(table.lastSeenSyncRunId),
  index("products_missing_since_sync_run_idx").on(table.missingSinceSyncRunId),
  check("products_price_nonnegative", sql`${table.priceMinor} >= 0`),
  check(
    "products_compare_price_nonnegative",
    sql`${table.compareAtPriceMinor} is null or ${table.compareAtPriceMinor} >= 0`,
  ),
  check(
    "products_availability_consistent",
    sql`${table.available} = (${table.availabilityStatus} in ('in_stock', 'limited', 'pre_order'))`,
  ),
  check(
    "products_measurements_positive",
    sql`(${table.weightGrams} is null or ${table.weightGrams} > 0)
      and (${table.lengthMm} is null or ${table.lengthMm} > 0)
      and (${table.widthMm} is null or ${table.widthMm} > 0)
      and (${table.heightMm} is null or ${table.heightMm} > 0)`,
  ),
]);

export const productColourways = pgTable("product_colourways", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  styleColor: text("style_color").notNull(),
  colour: text("colour").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  currency: currencyCode("currency").notNull(),
  priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
  compareAtPriceMinor: bigint("compare_at_price_minor", { mode: "number" }),
  available: boolean("available").notNull().default(true),
  availabilityStatus: availabilityStatus("availability_status").notNull().default("in_stock"),
  primaryImageUrl: text("primary_image_url").notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("product_colourways_product_style_uidx").on(table.productId, table.styleColor),
  index("product_colourways_product_active_idx").on(table.productId, table.isActive, table.position),
  check("product_colourways_price_nonnegative", sql`${table.priceMinor} >= 0`),
  check(
    "product_colourways_compare_price_nonnegative",
    sql`${table.compareAtPriceMinor} is null or ${table.compareAtPriceMinor} >= 0`,
  ),
  check(
    "product_colourways_availability_consistent",
    sql`${table.available} = (${table.availabilityStatus} in ('in_stock', 'limited', 'pre_order'))`,
  ),
  check("product_colourways_position_nonnegative", sql`${table.position} >= 0`),
]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  colourwayId: uuid("colourway_id").references(() => productColourways.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  sourceVariantId: text("source_variant_id").notNull(),
  sku: text("sku"),
  gtin: text("gtin"),
  title: text("title"),
  optionValues: jsonb("option_values").$type<Record<string, string>>().notNull().default({}),
  currency: currencyCode("currency").notNull(),
  priceMinor: bigint("price_minor", { mode: "number" }),
  compareAtPriceMinor: bigint("compare_at_price_minor", { mode: "number" }),
  available: boolean("available").notNull().default(true),
  availabilityStatus: availabilityStatus("availability_status").notNull().default("in_stock"),
  isActive: boolean("is_active").notNull().default(true),
  weightGrams: integer("weight_grams"),
  lengthMm: integer("length_mm"),
  widthMm: integer("width_mm"),
  heightMm: integer("height_mm"),
  measurementSource: measurementSource("measurement_source").notNull().default("unknown"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("product_variants_product_source_uidx").on(table.productId, table.sourceVariantId),
  index("product_variants_product_active_idx").on(table.productId, table.isActive, table.available),
  index("product_variants_colourway_active_idx").on(table.colourwayId, table.isActive, table.available),
  index("product_variants_sku_idx").on(table.sku),
  index("product_variants_gtin_idx").on(table.gtin),
  check(
    "product_variants_price_nonnegative",
    sql`${table.priceMinor} is null or ${table.priceMinor} >= 0`,
  ),
  check(
    "product_variants_availability_consistent",
    sql`${table.available} = (${table.availabilityStatus} in ('in_stock', 'limited', 'pre_order'))`,
  ),
  check(
    "product_variants_measurements_positive",
    sql`(${table.weightGrams} is null or ${table.weightGrams} > 0)
      and (${table.lengthMm} is null or ${table.lengthMm} > 0)
      and (${table.widthMm} is null or ${table.widthMm} > 0)
      and (${table.heightMm} is null or ${table.heightMm} > 0)`,
  ),
]);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  colourwayId: uuid("colourway_id").references(() => productColourways.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
  altText: text("alt_text"),
  position: integer("position").notNull().default(0),
  colorName: text("color_name"),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("product_images_product_url_uidx").on(table.productId, table.sourceUrl),
  index("product_images_product_position_idx").on(table.productId, table.position),
  index("product_images_colourway_position_idx").on(table.colourwayId, table.position),
  check("product_images_position_nonnegative", sql`${table.position} >= 0`),
]);

export const productOverrides = pgTable("product_overrides", {
  productId: uuid("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  title: text("title"),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  priceMinor: bigint("price_minor", { mode: "number" }),
  currency: currencyCode("currency"),
  available: boolean("available"),
  isActive: boolean("is_active"),
  isFeatured: boolean("is_featured"),
  reason: text("reason"),
  updatedBy: uuid("updated_by"),
  ...timestamps(),
}, (table) => [
  check("product_overrides_price_nonnegative", sql`${table.priceMinor} is null or ${table.priceMinor} >= 0`),
]);

export const catalogSyncRuns = pgTable("catalog_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storefrontId: uuid("storefront_id").notNull().references(() => storefronts.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  actorId: text("actor_id"),
  providerRunId: text("provider_run_id"),
  datasetId: text("dataset_id"),
  authoritative: boolean("authoritative").notNull().default(false),
  status: syncRunStatus("status").notNull().default("running"),
  productsReceived: integer("products_received").notNull().default(0),
  productsUpserted: integer("products_upserted").notNull().default(0),
  variantsUpserted: integer("variants_upserted").notNull().default(0),
  imagesUpserted: integer("images_upserted").notNull().default(0),
  colourwaysUpserted: integer("colourways_upserted").notNull().default(0),
  productsCoalesced: integer("products_coalesced").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("catalog_sync_runs_provider_run_uidx").on(table.provider, table.providerRunId),
  index("catalog_sync_runs_storefront_started_idx").on(table.storefrontId, table.startedAt),
]);

export const catalogSyncRunProducts = pgTable("catalog_sync_run_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  syncRunId: uuid("sync_run_id").notNull().references(() => catalogSyncRuns.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  observedSourceProductId: text("observed_source_product_id").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  styleCode: text("style_code"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("catalog_sync_run_products_run_product_uidx").on(table.syncRunId, table.productId),
  uniqueIndex("catalog_sync_run_products_run_source_uidx").on(
    table.syncRunId,
    table.observedSourceProductId,
  ),
  index("catalog_sync_run_products_product_run_idx").on(table.productId, table.syncRunId),
]);

export const catalogSyncErrors = pgTable("catalog_sync_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  syncRunId: uuid("sync_run_id").notNull().references(() => catalogSyncRuns.id, { onDelete: "cascade" }),
  sourceProductId: text("source_product_id"),
  sourceVariantId: text("source_variant_id"),
  stage: text("stage").notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("catalog_sync_errors_run_idx").on(table.syncRunId, table.createdAt)]);

export const catalogPriorityRefreshes = pgTable("catalog_priority_refreshes", {
  productId: uuid("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRunId: text("provider_run_id"),
  status: priorityRefreshStatus("status").notNull().default("starting"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  deduplicateUntil: timestamp("deduplicate_until", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  ...timestamps(),
}, (table) => [
  index("catalog_priority_refreshes_run_idx").on(table.provider, table.providerRunId),
  index("catalog_priority_refreshes_deduplicate_idx").on(table.deduplicateUntil),
]);
