ALTER TYPE "public"."availability_status" ADD VALUE 'unknown';--> statement-breakpoint
ALTER TABLE "catalog_sync_runs" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "catalog_sync_runs" ADD COLUMN "products_coalesced" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "source_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "source_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "source_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_availability_consistent" CHECK ("product_variants"."available" = ("product_variants"."availability_status" in ('in_stock', 'pre_order')));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_availability_consistent" CHECK ("products"."available" = ("products"."availability_status" in ('in_stock', 'pre_order')));