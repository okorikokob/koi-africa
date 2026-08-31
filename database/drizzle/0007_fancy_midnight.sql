CREATE TYPE "public"."payment_purpose" AS ENUM('product_and_service', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."payment_request_status" AS ENUM('pending', 'paid', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_reference" text NOT NULL,
	"order_id" uuid NOT NULL,
	"shipping_quote_id" uuid,
	"purpose" "payment_purpose" NOT NULL,
	"status" "payment_request_status" DEFAULT 'pending' NOT NULL,
	"currency" char(3) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"pricing_snapshot" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_requests_public_reference_unique" UNIQUE("public_reference"),
	CONSTRAINT "payment_requests_amount_nonnegative" CHECK ("payment_requests"."amount_minor" >= 0),
	CONSTRAINT "payment_requests_delivery_quote_required" CHECK ("payment_requests"."purpose" <> 'delivery' or "payment_requests"."shipping_quote_id" is not null),
	CONSTRAINT "payment_requests_product_quote_forbidden" CHECK ("payment_requests"."purpose" <> 'product_and_service' or "payment_requests"."shipping_quote_id" is null)
);
--> statement-breakpoint
CREATE TABLE "service_fee_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency" char(3) NOT NULL,
	"category_key" text,
	"percentage_basis_points" integer NOT NULL,
	"minimum_fee_minor" bigint DEFAULT 0 NOT NULL,
	"maximum_fee_minor" bigint,
	"approval_reference" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_fee_policies_percentage_valid" CHECK ("service_fee_policies"."percentage_basis_points" >= 0 and "service_fee_policies"."percentage_basis_points" <= 10000),
	CONSTRAINT "service_fee_policies_amounts_valid" CHECK ("service_fee_policies"."minimum_fee_minor" >= 0
    and ("service_fee_policies"."maximum_fee_minor" is null or "service_fee_policies"."maximum_fee_minor" >= "service_fee_policies"."minimum_fee_minor")),
	CONSTRAINT "service_fee_policies_effective_range_valid" CHECK ("service_fee_policies"."effective_until" is null or "service_fee_policies"."effective_until" > "service_fee_policies"."effective_from")
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_amounts_nonnegative";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_total_matches_parts";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_fee_policy_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_fee_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_request_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "purpose" "payment_purpose" DEFAULT 'product_and_service' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "delivery_payment_request_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_shipping_quote_id_shipping_quotes_id_fk" FOREIGN KEY ("shipping_quote_id") REFERENCES "public"."shipping_quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_requests_order_purpose_idx" ON "payment_requests" USING btree ("order_id","purpose","status");--> statement-breakpoint
CREATE INDEX "payment_requests_quote_idx" ON "payment_requests" USING btree ("shipping_quote_id");--> statement-breakpoint
CREATE INDEX "service_fee_policies_lookup_idx" ON "service_fee_policies" USING btree ("currency","category_key","is_active");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_fee_policy_id_service_fee_policies_id_fk" FOREIGN KEY ("service_fee_policy_id") REFERENCES "public"."service_fee_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_request_id_payment_requests_id_fk" FOREIGN KEY ("payment_request_id") REFERENCES "public"."payment_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_payment_request_id_payment_requests_id_fk" FOREIGN KEY ("delivery_payment_request_id") REFERENCES "public"."payment_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_request_idx" ON "payments" USING btree ("payment_request_id");--> statement-breakpoint
CREATE INDEX "shipments_delivery_payment_request_idx" ON "shipments" USING btree ("delivery_payment_request_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."product_subtotal_minor" >= 0
    and "orders"."service_fee_minor" >= 0
    and "orders"."shipping_total_minor" >= 0
    and "orders"."customs_total_minor" >= 0
    and "orders"."total_minor" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_matches_parts" CHECK ("orders"."total_minor" = "orders"."product_subtotal_minor" + "orders"."service_fee_minor" + "orders"."shipping_total_minor" + "orders"."customs_total_minor");