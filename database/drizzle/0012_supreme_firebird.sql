DROP INDEX "products_storefront_canonical_url_uidx";--> statement-breakpoint
CREATE INDEX "products_storefront_canonical_url_idx" ON "products" USING btree ("storefront_id","canonical_url");