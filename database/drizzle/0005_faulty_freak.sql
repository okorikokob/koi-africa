CREATE TYPE "public"."customs_assessment_status" AS ENUM('unknown', 'estimated', 'confirmed', 'paid', 'waived');--> statement-breakpoint
CREATE TYPE "public"."shipping_quote_stage" AS ENUM('estimated', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."charge_payer" AS ENUM('customer', 'koi');--> statement-breakpoint
CREATE TYPE "public"."customs_charge_status" AS ENUM('reported', 'confirmed', 'paid', 'waived', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('awaiting_product', 'received_at_hub', 'measured', 'quoted', 'booked', 'picked_up', 'in_transit', 'customs_hold', 'customs_cleared', 'out_for_delivery', 'delivered', 'exception', 'return_requested', 'returning', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shipping_restriction_status" AS ENUM('pending_review', 'eligible', 'restricted', 'manual_review');--> statement-breakpoint
CREATE TABLE "shipment_customs_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"status" "customs_charge_status" DEFAULT 'reported' NOT NULL,
	"payer" charge_payer DEFAULT 'customer' NOT NULL,
	"authority" text,
	"charge_reference" text,
	"description" text NOT NULL,
	"source_currency" char(3) NOT NULL,
	"source_amount_minor" bigint NOT NULL,
	"pricing_currency" char(3) NOT NULL,
	"pricing_amount_minor" bigint NOT NULL,
	"exchange_rate_snapshot" jsonb,
	"incurred_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_customs_amounts_nonnegative" CHECK ("shipment_customs_charges"."source_amount_minor" >= 0 and "shipment_customs_charges"."pricing_amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"order_item_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"source_product_id" text NOT NULL,
	"source_variant_id" text,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_items_quantity_positive" CHECK ("shipment_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "shipment_tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"provider_event_id" text,
	"status" "shipment_status" NOT NULL,
	"provider_status" text,
	"description" text,
	"location" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"provider_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_reference" text NOT NULL,
	"order_id" uuid,
	"shipping_quote_id" uuid,
	"provider" text NOT NULL,
	"provider_account_reference" text,
	"provider_shipment_id" text,
	"tracking_number" text,
	"status" "shipment_status" DEFAULT 'awaiting_product' NOT NULL,
	"restriction_status" "shipping_restriction_status" DEFAULT 'pending_review' NOT NULL,
	"restriction_reason" text,
	"origin_country_code" text NOT NULL,
	"destination_country_code" text DEFAULT 'NG' NOT NULL,
	"actual_weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"measurement_source" "measurement_source" DEFAULT 'unknown' NOT NULL,
	"measured_at" timestamp with time zone,
	"return_shipping_payer" charge_payer DEFAULT 'customer' NOT NULL,
	"return_shipping_currency" char(3),
	"return_shipping_minor" bigint,
	"booked_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_public_reference_unique" UNIQUE("public_reference"),
	CONSTRAINT "shipments_measurements_positive" CHECK (("shipments"."actual_weight_grams" is null or "shipments"."actual_weight_grams" > 0)
    and ("shipments"."length_mm" is null or "shipments"."length_mm" > 0)
    and ("shipments"."width_mm" is null or "shipments"."width_mm" > 0)
    and ("shipments"."height_mm" is null or "shipments"."height_mm" > 0)),
	CONSTRAINT "shipments_return_amount_nonnegative" CHECK ("shipments"."return_shipping_minor" is null or "shipments"."return_shipping_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "shipping_quotes" DROP CONSTRAINT "shipping_quotes_amount_nonnegative";--> statement-breakpoint
ALTER TABLE "shipping_quotes" DROP CONSTRAINT "shipping_quotes_weights_nonnegative";--> statement-breakpoint
ALTER TABLE "shipping_quote_items" ADD COLUMN "measurement_source" "measurement_source" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "stage" "shipping_quote_stage" DEFAULT 'estimated' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "billed_weight_grams" integer;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "measurement_source" "measurement_source";--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "provider_cost_minor" bigint;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "logistics_margin_minor" bigint;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "local_delivery_minor" bigint;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "customs_status" "customs_assessment_status" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "customs_duty_minor" bigint;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipping_rate_cards" ADD COLUMN "billing_increment_grams" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_rate_cards" ADD COLUMN "source_reference" text;--> statement-breakpoint
UPDATE "shipping_quotes"
SET "provider_cost_minor" = "amount_minor",
    "logistics_margin_minor" = 0,
    "local_delivery_minor" = 0
WHERE "amount_minor" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "shipment_customs_charges" ADD CONSTRAINT "shipment_customs_charges_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_quote_id_shipping_quotes_id_fk" FOREIGN KEY ("shipping_quote_id") REFERENCES "public"."shipping_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_customs_shipment_status_idx" ON "shipment_customs_charges" USING btree ("shipment_id","status");--> statement-breakpoint
CREATE INDEX "shipment_items_shipment_idx" ON "shipment_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_tracking_provider_event_uidx" ON "shipment_tracking_events" USING btree ("shipment_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "shipment_tracking_occurred_idx" ON "shipment_tracking_events" USING btree ("shipment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_provider_shipment_uidx" ON "shipments" USING btree ("provider","provider_shipment_id");--> statement-breakpoint
CREATE INDEX "shipments_order_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipments_tracking_idx" ON "shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "shipments_status_updated_idx" ON "shipments" USING btree ("status","updated_at");--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_amounts_nonnegative" CHECK (("shipping_quotes"."provider_cost_minor" is null or "shipping_quotes"."provider_cost_minor" >= 0)
    and ("shipping_quotes"."logistics_margin_minor" is null or "shipping_quotes"."logistics_margin_minor" >= 0)
    and ("shipping_quotes"."local_delivery_minor" is null or "shipping_quotes"."local_delivery_minor" >= 0)
    and ("shipping_quotes"."amount_minor" is null or "shipping_quotes"."amount_minor" >= 0)
    and ("shipping_quotes"."customs_duty_minor" is null or "shipping_quotes"."customs_duty_minor" >= 0));--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_delivery_total_matches" CHECK ("shipping_quotes"."amount_minor" is null
    or ("shipping_quotes"."provider_cost_minor" is not null
      and "shipping_quotes"."logistics_margin_minor" is not null
      and "shipping_quotes"."local_delivery_minor" is not null
      and "shipping_quotes"."amount_minor" = "shipping_quotes"."provider_cost_minor" + "shipping_quotes"."logistics_margin_minor" + "shipping_quotes"."local_delivery_minor"));--> statement-breakpoint
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_weights_nonnegative" CHECK (("shipping_quotes"."actual_weight_grams" is null or "shipping_quotes"."actual_weight_grams" >= 0)
    and ("shipping_quotes"."volumetric_weight_grams" is null or "shipping_quotes"."volumetric_weight_grams" >= 0)
    and ("shipping_quotes"."chargeable_weight_grams" is null or "shipping_quotes"."chargeable_weight_grams" >= 0)
    and ("shipping_quotes"."billed_weight_grams" is null or "shipping_quotes"."billed_weight_grams" >= 0));--> statement-breakpoint
ALTER TABLE "shipping_rate_cards" ADD CONSTRAINT "shipping_rate_cards_billing_increment_positive" CHECK ("shipping_rate_cards"."billing_increment_grams" > 0);
