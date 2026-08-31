CREATE TYPE "public"."admin_role" AS ENUM('admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('in_stock', 'pre_order', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."measurement_source" AS ENUM('provider', 'measured', 'estimated', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_quote', 'awaiting_payment', 'paid', 'sourcing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."shipping_quote_status" AS ENUM('pending', 'quoted', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider" text NOT NULL,
	"auth_subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "admin_role" DEFAULT 'operator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_signed_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"official_domain" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_sync_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"source_product_id" text,
	"source_variant_id" text,
	"stage" text NOT NULL,
	"error_code" text,
	"error_message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storefront_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_run_id" text,
	"dataset_id" text,
	"authoritative" boolean DEFAULT false NOT NULL,
	"status" "sync_run_status" DEFAULT 'running' NOT NULL,
	"products_received" integer DEFAULT 0 NOT NULL,
	"products_upserted" integer DEFAULT 0 NOT NULL,
	"variants_upserted" integer DEFAULT 0 NOT NULL,
	"images_upserted" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"color_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_position_nonnegative" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_overrides" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"category_id" uuid,
	"price_minor" bigint,
	"currency" char(3),
	"available" boolean,
	"is_active" boolean,
	"is_featured" boolean,
	"reason" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_overrides_price_nonnegative" CHECK ("product_overrides"."price_minor" is null or "product_overrides"."price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"source_variant_id" text NOT NULL,
	"sku" text,
	"gtin" text,
	"title" text,
	"option_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currency" char(3) NOT NULL,
	"price_minor" bigint,
	"compare_at_price_minor" bigint,
	"available" boolean DEFAULT true NOT NULL,
	"availability_status" "availability_status" DEFAULT 'in_stock' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"measurement_source" "measurement_source" DEFAULT 'unknown' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_price_nonnegative" CHECK ("product_variants"."price_minor" is null or "product_variants"."price_minor" >= 0),
	CONSTRAINT "product_variants_measurements_positive" CHECK (("product_variants"."weight_grams" is null or "product_variants"."weight_grams" > 0)
      and ("product_variants"."length_mm" is null or "product_variants"."length_mm" > 0)
      and ("product_variants"."width_mm" is null or "product_variants"."width_mm" > 0)
      and ("product_variants"."height_mm" is null or "product_variants"."height_mm" > 0))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storefront_id" uuid NOT NULL,
	"brand_id" uuid,
	"category_id" uuid,
	"provider" text NOT NULL,
	"source_product_id" text NOT NULL,
	"style_code" text,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"product_type" text,
	"department" text,
	"currency" char(3) NOT NULL,
	"price_minor" bigint NOT NULL,
	"compare_at_price_minor" bigint,
	"available" boolean DEFAULT true NOT NULL,
	"availability_status" "availability_status" DEFAULT 'in_stock' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"measurement_source" "measurement_source" DEFAULT 'unknown' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_nonnegative" CHECK ("products"."price_minor" >= 0),
	CONSTRAINT "products_compare_price_nonnegative" CHECK ("products"."compare_at_price_minor" is null or "products"."compare_at_price_minor" >= 0),
	CONSTRAINT "products_measurements_positive" CHECK (("products"."weight_grams" is null or "products"."weight_grams" > 0)
      and ("products"."length_mm" is null or "products"."length_mm" > 0)
      and ("products"."width_mm" is null or "products"."width_mm" > 0)
      and ("products"."height_mm" is null or "products"."height_mm" > 0))
);
--> statement-breakpoint
CREATE TABLE "storefronts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"source_storefront_id" text NOT NULL,
	"country_code" text NOT NULL,
	"locale" text NOT NULL,
	"currency" char(3) NOT NULL,
	"official_base_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"source_product_id" text NOT NULL,
	"source_variant_id" text,
	"sku" text,
	"gtin" text,
	"title" text NOT NULL,
	"brand_name" text NOT NULL,
	"image_url" text,
	"vendor_name" text NOT NULL,
	"vendor_url" text NOT NULL,
	"selected_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" char(3) NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"weight_grams_snapshot" integer,
	"dimensions_mm_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("order_items"."unit_price_minor" >= 0),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"changed_by_admin_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"delivery_address" text NOT NULL,
	"delivery_city" text NOT NULL,
	"delivery_region" text NOT NULL,
	"delivery_country_code" text DEFAULT 'NG' NOT NULL,
	"delivery_landmark" text,
	"pricing_currency" char(3) NOT NULL,
	"display_currency" char(3) NOT NULL,
	"product_subtotal_minor" bigint NOT NULL,
	"shipping_total_minor" bigint NOT NULL,
	"customs_total_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint NOT NULL,
	"exchange_rate_snapshot" jsonb,
	"shipping_quote_id" uuid,
	"status" "order_status" DEFAULT 'pending_quote' NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference"),
	CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."product_subtotal_minor" >= 0
    and "orders"."shipping_total_minor" >= 0
    and "orders"."customs_total_minor" >= 0
    and "orders"."total_minor" >= 0),
	CONSTRAINT "orders_total_matches_parts" CHECK ("orders"."total_minor" = "orders"."product_subtotal_minor" + "orders"."shipping_total_minor" + "orders"."customs_total_minor")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'paystack' NOT NULL,
	"provider_reference" text NOT NULL,
	"currency" char(3) NOT NULL,
	"expected_amount_minor" bigint NOT NULL,
	"verified_amount_minor" bigint,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"channel" text,
	"provider_response" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_expected_amount_nonnegative" CHECK ("payments"."expected_amount_minor" >= 0),
	CONSTRAINT "payments_verified_amount_nonnegative" CHECK ("payments"."verified_amount_minor" is null or "payments"."verified_amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" char(3) NOT NULL,
	"quote_currency" char(3) NOT NULL,
	"rate" numeric(24, 12) NOT NULL,
	"source" text NOT NULL,
	"source_reference" text,
	"effective_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_positive" CHECK ("exchange_rates"."rate" > 0),
	CONSTRAINT "exchange_rates_distinct_currencies" CHECK ("exchange_rates"."base_currency" <> "exchange_rates"."quote_currency")
);
--> statement-breakpoint
CREATE TABLE "shipping_quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipping_quote_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"source_product_id" text NOT NULL,
	"source_variant_id" text,
	"quantity" integer NOT NULL,
	"unit_weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_quote_items_quantity_positive" CHECK ("shipping_quote_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_reference" text NOT NULL,
	"status" "shipping_quote_status" DEFAULT 'pending' NOT NULL,
	"destination_zone_id" uuid,
	"rate_card_id" uuid,
	"destination_country_code" text NOT NULL,
	"destination_region" text,
	"destination_city" text,
	"actual_weight_grams" integer,
	"volumetric_weight_grams" integer,
	"chargeable_weight_grams" integer,
	"currency" char(3),
	"amount_minor" bigint,
	"calculation_snapshot" jsonb,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_quotes_public_reference_unique" UNIQUE("public_reference"),
	CONSTRAINT "shipping_quotes_weights_nonnegative" CHECK (("shipping_quotes"."actual_weight_grams" is null or "shipping_quotes"."actual_weight_grams" >= 0)
    and ("shipping_quotes"."volumetric_weight_grams" is null or "shipping_quotes"."volumetric_weight_grams" >= 0)
    and ("shipping_quotes"."chargeable_weight_grams" is null or "shipping_quotes"."chargeable_weight_grams" >= 0)),
	CONSTRAINT "shipping_quotes_amount_nonnegative" CHECK ("shipping_quotes"."amount_minor" is null or "shipping_quotes"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"service_name" text NOT NULL,
	"origin_zone_id" uuid,
	"destination_zone_id" uuid NOT NULL,
	"currency" char(3) NOT NULL,
	"minimum_charge_minor" bigint DEFAULT 0 NOT NULL,
	"rate_per_kg_minor" bigint NOT NULL,
	"minimum_weight_grams" integer DEFAULT 0 NOT NULL,
	"maximum_weight_grams" integer,
	"volumetric_divisor_cm3_per_kg" numeric(12, 3) NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_rate_cards_amounts_nonnegative" CHECK ("shipping_rate_cards"."minimum_charge_minor" >= 0 and "shipping_rate_cards"."rate_per_kg_minor" >= 0),
	CONSTRAINT "shipping_rate_cards_weights_valid" CHECK ("shipping_rate_cards"."minimum_weight_grams" >= 0 and ("shipping_rate_cards"."maximum_weight_grams" is null or "shipping_rate_cards"."maximum_weight_grams" > "shipping_rate_cards"."minimum_weight_grams")),
	CONSTRAINT "shipping_rate_cards_divisor_positive" CHECK ("shipping_rate_cards"."volumetric_divisor_cm3_per_kg" > 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"region_code" text,
	"city" text,
	"postal_code_pattern" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_sync_errors" ADD CONSTRAINT "catalog_sync_errors_sync_run_id_catalog_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."catalog_sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_sync_runs" ADD CONSTRAINT "catalog_sync_runs_storefront_id_storefronts_id_fk" FOREIGN KEY ("storefront_id") REFERENCES "public"."storefronts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD CONSTRAINT "product_overrides_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_overrides" ADD CONSTRAINT "product_overrides_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_storefront_id_storefronts_id_fk" FOREIGN KEY ("storefront_id") REFERENCES "public"."storefronts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_quote_id_shipping_quotes_id_fk" FOREIGN KEY ("shipping_quote_id") REFERENCES "public"."shipping_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quote_items" ADD CONSTRAINT "shipping_quote_items_shipping_quote_id_shipping_quotes_id_fk" FOREIGN KEY ("shipping_quote_id") REFERENCES "public"."shipping_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quote_items" ADD CONSTRAINT "shipping_quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quote_items" ADD CONSTRAINT "shipping_quote_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_destination_zone_id_shipping_zones_id_fk" FOREIGN KEY ("destination_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_rate_card_id_shipping_rate_cards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "public"."shipping_rate_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rate_cards" ADD CONSTRAINT "shipping_rate_cards_origin_zone_id_shipping_zones_id_fk" FOREIGN KEY ("origin_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rate_cards" ADD CONSTRAINT "shipping_rate_cards_destination_zone_id_shipping_zones_id_fk" FOREIGN KEY ("destination_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_provider_subject_uidx" ON "admin_users" USING btree ("auth_provider","auth_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uidx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "catalog_sync_errors_run_idx" ON "catalog_sync_errors" USING btree ("sync_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_sync_runs_provider_run_uidx" ON "catalog_sync_runs" USING btree ("provider","provider_run_id");--> statement-breakpoint
CREATE INDEX "catalog_sync_runs_storefront_started_idx" ON "catalog_sync_runs" USING btree ("storefront_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_url_uidx" ON "product_images" USING btree ("product_id","source_url");--> statement-breakpoint
CREATE INDEX "product_images_product_position_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_source_uidx" ON "product_variants" USING btree ("product_id","source_variant_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_active_idx" ON "product_variants" USING btree ("product_id","is_active","available");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_gtin_idx" ON "product_variants" USING btree ("gtin");--> statement-breakpoint
CREATE UNIQUE INDEX "products_provider_storefront_source_uidx" ON "products" USING btree ("provider","storefront_id","source_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_storefront_canonical_url_uidx" ON "products" USING btree ("storefront_id","canonical_url");--> statement-breakpoint
CREATE INDEX "products_storefront_active_idx" ON "products" USING btree ("storefront_id","is_active","available");--> statement-breakpoint
CREATE UNIQUE INDEX "storefronts_provider_source_uidx" ON "storefronts" USING btree ("provider","source_storefront_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefronts_brand_provider_region_uidx" ON "storefronts" USING btree ("brand_id","provider","country_code","locale");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_created_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_uidx" ON "payments" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_source_pair_effective_uidx" ON "exchange_rates" USING btree ("source","base_currency","quote_currency","effective_at");--> statement-breakpoint
CREATE INDEX "exchange_rates_pair_effective_idx" ON "exchange_rates" USING btree ("base_currency","quote_currency","effective_at");--> statement-breakpoint
CREATE INDEX "shipping_quote_items_quote_idx" ON "shipping_quote_items" USING btree ("shipping_quote_id");--> statement-breakpoint
CREATE INDEX "shipping_quotes_status_created_idx" ON "shipping_quotes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "shipping_rate_cards_lookup_idx" ON "shipping_rate_cards" USING btree ("destination_zone_id","is_active","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zones_location_uidx" ON "shipping_zones" USING btree ("name","country_code","region_code","city");