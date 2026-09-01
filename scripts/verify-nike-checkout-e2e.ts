import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

type Candidate = {
  productId: string;
  title: string;
  sourceVariantId: string;
  freshness: Date;
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const candidates = await sql<Candidate[]>`
    select distinct on (p.id)
      p.id as "productId", p.title, v.source_variant_id as "sourceVariantId",
      least(coalesce(p.source_updated_at, p.last_synced_at), coalesce(v.source_updated_at, v.last_seen_at)) as freshness
    from products p
    join storefronts s on s.id = p.storefront_id
    join product_variants v on v.product_id = p.id
    where p.provider = 'apify' and s.source_storefront_id = 'nike-us'
      and p.is_active and p.available and p.availability_status in ('in_stock', 'limited')
      and v.is_active and v.available and v.availability_status in ('in_stock', 'limited')
      and v.price_minor is not null
      and least(coalesce(p.source_updated_at, p.last_synced_at), coalesce(v.source_updated_at, v.last_seen_at)) < now() - interval '6 hours'
    order by p.id, v.source_variant_id
    limit 1
  `;
  const candidate = candidates[0];
  if (!candidate) throw new Error("No stale purchasable Nike candidate was found.");

  try {
      const startedAt = Date.now();
      const pdp = await fetch(`${baseUrl}/products/${candidate.productId}`);
      await pdp.arrayBuffer();
      if (!pdp.ok) throw new Error(`PDP failed for ${candidate.title} (${pdp.status}).`);
      const cart = await fetch(`${baseUrl}/cart`);
      if (!cart.ok) throw new Error("Cart route failed.");
      const checkout = await fetch(`${baseUrl}/checkout`);
      if (!checkout.ok) throw new Error("Checkout route failed.");
      const payment = await fetch(`${baseUrl}/api/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "KOI Checkout Test",
          email: "checkout-test@koi.africa",
          whatsapp: "08000000000",
          address: "1 Local Test Avenue",
          city: "Abuja",
          state: "FCT",
          items: [{ productId: candidate.productId, variantId: candidate.sourceVariantId, qty: 1 }],
        }),
      });
      const payload = await payment.json() as {
        success?: boolean;
        data?: {
          authorizationUrl?: string;
          reference?: string;
          pricing?: {
            acquisitionSubtotalMinor: number;
            serviceMarginMinor: number;
            sellingSubtotalMinor: number;
            logisticsDepositMinor: number;
            customsTotalMinor: number;
            firstPaymentTotalMinor: number;
          };
        };
        error?: string;
      };
      if (!payment.ok || !payload.success || !payload.data?.authorizationUrl?.includes("paystack")) {
        throw new Error(`${candidate.title}: ${payload.error ?? `payment initialization returned ${payment.status}`}`);
      }
      if (!payload.data.reference || !payload.data.pricing) throw new Error("Pricing evidence is missing from initialization.");
      const paystackVerification = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(payload.data.reference)}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}` } },
      );
      const paystackPayload = await paystackVerification.json() as { data?: { amount?: number; currency?: string; status?: string } };
      if (
        !paystackVerification.ok
        || paystackPayload.data?.amount !== payload.data.pricing.firstPaymentTotalMinor
        || paystackPayload.data?.currency !== "NGN"
      ) {
        throw new Error("Paystack did not retain the exact NGN first-payment amount.");
      }
      if (
        payload.data.pricing.sellingSubtotalMinor
          !== payload.data.pricing.acquisitionSubtotalMinor + payload.data.pricing.serviceMarginMinor
        || payload.data.pricing.logisticsDepositMinor !== 3_000_000
        || payload.data.pricing.customsTotalMinor !== 0
        || payload.data.pricing.firstPaymentTotalMinor
          !== payload.data.pricing.sellingSubtotalMinor + payload.data.pricing.logisticsDepositMinor
      ) {
        throw new Error("The initialized Nike pricing breakdown is inconsistent.");
      }
      console.log(JSON.stringify({
        title: candidate.title,
        productId: candidate.productId,
        sourceVariantId: candidate.sourceVariantId,
        pdp: pdp.status,
        cart: cart.status,
        checkout: checkout.status,
        staleAgeMinutes: Math.floor((Date.now() - candidate.freshness.getTime()) / 60_000),
        paystackOpened: true,
        paystackStatus: paystackPayload.data.status,
        paystackAmountMinor: paystackPayload.data.amount,
        pricing: payload.data.pricing,
        reference: payload.data.reference,
        elapsedMs: Date.now() - startedAt,
      }));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("[verify-nike-checkout-e2e]", error);
  process.exitCode = 1;
});
