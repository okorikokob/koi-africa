CREATE TYPE "public"."priority_refresh_status" AS ENUM('starting', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "catalog_priority_refreshes" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_run_id" text,
	"status" "priority_refresh_status" DEFAULT 'starting' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deduplicate_until" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_priority_refreshes" ADD CONSTRAINT "catalog_priority_refreshes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_priority_refreshes_run_idx" ON "catalog_priority_refreshes" USING btree ("provider","provider_run_id");--> statement-breakpoint
CREATE INDEX "catalog_priority_refreshes_deduplicate_idx" ON "catalog_priority_refreshes" USING btree ("deduplicate_until");