CREATE TYPE "public"."logistics_reconciliation_status" AS ENUM('pending_measurement', 'no_adjustment', 'refund_due', 'refunded', 'top_up_due', 'top_up_paid');--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_total_matches_parts";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_amounts_nonnegative";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "source_currency" char(3);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "source_unit_price_minor" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "acquisition_unit_minor" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "service_margin_unit_minor" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "selling_unit_minor" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "exchange_rate_snapshot" jsonb;--> statement-breakpoint
UPDATE "order_items" SET
  "source_currency" = "currency",
  "source_unit_price_minor" = "unit_price_minor",
  "acquisition_unit_minor" = "unit_price_minor",
  "service_margin_unit_minor" = 0,
  "selling_unit_minor" = "unit_price_minor",
  "exchange_rate_snapshot" = '{"legacy":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "source_currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "source_unit_price_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "acquisition_unit_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "service_margin_unit_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "selling_unit_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "exchange_rate_snapshot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "logistics_deposit_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "actual_logistics_minor" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "logistics_adjustment_minor" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "logistics_reconciliation_status" "logistics_reconciliation_status" DEFAULT 'pending_measurement' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_pricing_nonnegative" CHECK ("order_items"."source_unit_price_minor" >= 0
    and "order_items"."acquisition_unit_minor" >= 0
    and "order_items"."service_margin_unit_minor" >= 0
    and "order_items"."selling_unit_minor" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_selling_price_matches_parts" CHECK ("order_items"."selling_unit_minor" = "order_items"."acquisition_unit_minor" + "order_items"."service_margin_unit_minor");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_compatibility_price_matches_selling" CHECK ("order_items"."unit_price_minor" = "order_items"."selling_unit_minor");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_first_payment_total_matches_parts" CHECK ("orders"."total_minor" = "orders"."product_subtotal_minor" + "orders"."service_fee_minor" + "orders"."logistics_deposit_minor");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_logistics_adjustment_consistent" CHECK (
    ("orders"."actual_logistics_minor" is null and "orders"."logistics_adjustment_minor" is null)
    or ("orders"."actual_logistics_minor" is not null
      and "orders"."logistics_adjustment_minor" = "orders"."actual_logistics_minor" - "orders"."logistics_deposit_minor"));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."product_subtotal_minor" >= 0
    and "orders"."service_fee_minor" >= 0
    and "orders"."shipping_total_minor" >= 0
    and "orders"."customs_total_minor" >= 0
    and "orders"."logistics_deposit_minor" >= 0
    and ("orders"."actual_logistics_minor" is null or "orders"."actual_logistics_minor" >= 0)
    and "orders"."total_minor" >= 0);
