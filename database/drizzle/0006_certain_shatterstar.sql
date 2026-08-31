CREATE TABLE "shipment_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"piece_number" integer NOT NULL,
	"provider_piece_id" text,
	"actual_weight_grams" integer NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"measurement_source" "measurement_source" DEFAULT 'measured' NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_packages_measurements_positive" CHECK ("shipment_packages"."piece_number" > 0
    and "shipment_packages"."actual_weight_grams" > 0
    and "shipment_packages"."length_mm" > 0
    and "shipment_packages"."width_mm" > 0
    and "shipment_packages"."height_mm" > 0),
	CONSTRAINT "shipment_packages_source_measured" CHECK ("shipment_packages"."measurement_source" = 'measured')
);
--> statement-breakpoint
CREATE TABLE "shipping_quote_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipping_quote_id" uuid NOT NULL,
	"shipment_package_id" uuid,
	"piece_number" integer NOT NULL,
	"provider_piece_id" text,
	"actual_weight_grams" integer NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"measurement_source" "measurement_source" DEFAULT 'measured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_quote_packages_measurements_positive" CHECK ("shipping_quote_packages"."piece_number" > 0
    and "shipping_quote_packages"."actual_weight_grams" > 0
    and "shipping_quote_packages"."length_mm" > 0
    and "shipping_quote_packages"."width_mm" > 0
    and "shipping_quote_packages"."height_mm" > 0),
	CONSTRAINT "shipping_quote_packages_source_measured" CHECK ("shipping_quote_packages"."measurement_source" = 'measured')
);
--> statement-breakpoint
ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quote_packages" ADD CONSTRAINT "shipping_quote_packages_shipping_quote_id_shipping_quotes_id_fk" FOREIGN KEY ("shipping_quote_id") REFERENCES "public"."shipping_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_quote_packages" ADD CONSTRAINT "shipping_quote_packages_shipment_package_id_shipment_packages_id_fk" FOREIGN KEY ("shipment_package_id") REFERENCES "public"."shipment_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_packages_piece_uidx" ON "shipment_packages" USING btree ("shipment_id","piece_number");--> statement-breakpoint
CREATE INDEX "shipment_packages_shipment_idx" ON "shipment_packages" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_quote_packages_piece_uidx" ON "shipping_quote_packages" USING btree ("shipping_quote_id","piece_number");--> statement-breakpoint
CREATE INDEX "shipping_quote_packages_quote_idx" ON "shipping_quote_packages" USING btree ("shipping_quote_id");