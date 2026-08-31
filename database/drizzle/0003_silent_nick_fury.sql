CREATE TABLE "product_colourways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"style_color" text NOT NULL,
	"colour" text NOT NULL,
	"canonical_url" text NOT NULL,
	"currency" char(3) NOT NULL,
	"price_minor" bigint NOT NULL,
	"compare_at_price_minor" bigint,
	"available" boolean DEFAULT true NOT NULL,
	"availability_status" "availability_status" DEFAULT 'in_stock' NOT NULL,
	"primary_image_url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_colourways_price_nonnegative" CHECK ("product_colourways"."price_minor" >= 0),
	CONSTRAINT "product_colourways_compare_price_nonnegative" CHECK ("product_colourways"."compare_at_price_minor" is null or "product_colourways"."compare_at_price_minor" >= 0),
	CONSTRAINT "product_colourways_availability_consistent" CHECK ("product_colourways"."available" = ("product_colourways"."availability_status" in ('in_stock', 'limited', 'pre_order'))),
	CONSTRAINT "product_colourways_position_nonnegative" CHECK ("product_colourways"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_sync_runs" ADD COLUMN "colourways_upserted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "colourway_id" uuid;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "colourway_id" uuid;--> statement-breakpoint
ALTER TABLE "product_colourways" ADD CONSTRAINT "product_colourways_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_colourways_product_style_uidx" ON "product_colourways" USING btree ("product_id","style_color");--> statement-breakpoint
CREATE INDEX "product_colourways_product_active_idx" ON "product_colourways" USING btree ("product_id","is_active","position");--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_colourway_id_product_colourways_id_fk" FOREIGN KEY ("colourway_id") REFERENCES "public"."product_colourways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_colourway_id_product_colourways_id_fk" FOREIGN KEY ("colourway_id") REFERENCES "public"."product_colourways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_colourway_position_idx" ON "product_images" USING btree ("colourway_id","position");--> statement-breakpoint
CREATE INDEX "product_variants_colourway_active_idx" ON "product_variants" USING btree ("colourway_id","is_active","available");