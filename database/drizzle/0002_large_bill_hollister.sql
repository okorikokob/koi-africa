ALTER TYPE "public"."availability_status" ADD VALUE 'limited' BEFORE 'pre_order';--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_availability_consistent";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_availability_consistent";--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_availability_consistent" CHECK ("product_variants"."available" = ("product_variants"."availability_status"::text in ('in_stock', 'limited', 'pre_order')));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_availability_consistent" CHECK ("products"."available" = ("products"."availability_status"::text in ('in_stock', 'limited', 'pre_order')));
