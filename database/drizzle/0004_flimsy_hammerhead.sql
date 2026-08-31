CREATE TABLE "catalog_sync_run_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"observed_source_product_id" text NOT NULL,
	"canonical_url" text NOT NULL,
	"style_code" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "last_seen_sync_run_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "missing_since_sync_run_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deactivated_by_sync_run_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deactivation_reason" text;--> statement-breakpoint
ALTER TABLE "catalog_sync_run_products" ADD CONSTRAINT "catalog_sync_run_products_sync_run_id_catalog_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."catalog_sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_sync_run_products" ADD CONSTRAINT "catalog_sync_run_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_sync_run_products_run_product_uidx" ON "catalog_sync_run_products" USING btree ("sync_run_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_sync_run_products_run_source_uidx" ON "catalog_sync_run_products" USING btree ("sync_run_id","observed_source_product_id");--> statement-breakpoint
CREATE INDEX "catalog_sync_run_products_product_run_idx" ON "catalog_sync_run_products" USING btree ("product_id","sync_run_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_last_seen_sync_run_id_catalog_sync_runs_id_fk" FOREIGN KEY ("last_seen_sync_run_id") REFERENCES "public"."catalog_sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_missing_since_sync_run_id_catalog_sync_runs_id_fk" FOREIGN KEY ("missing_since_sync_run_id") REFERENCES "public"."catalog_sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_deactivated_by_sync_run_id_catalog_sync_runs_id_fk" FOREIGN KEY ("deactivated_by_sync_run_id") REFERENCES "public"."catalog_sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_last_seen_sync_run_idx" ON "products" USING btree ("last_seen_sync_run_id");--> statement-breakpoint
CREATE INDEX "products_missing_since_sync_run_idx" ON "products" USING btree ("missing_since_sync_run_id");