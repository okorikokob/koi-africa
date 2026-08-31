import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

loadEnvConfig(process.cwd());
const execFileAsync = promisify(execFile);

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
      const payload = await payment.json() as { success?: boolean; data?: { authorizationUrl?: string; reference?: string }; error?: string };
      if (!payment.ok || !payload.success || !payload.data?.authorizationUrl?.includes("paystack")) {
        throw new Error(`${candidate.title}: ${payload.error ?? `payment initialization returned ${payment.status}`}`);
      }
      const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
      const { stdout: paystackHtml } = await execFileAsync(chromePath, [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--dump-dom",
        payload.data.authorizationUrl,
      ], { timeout: 30_000, maxBuffer: 5_000_000 });
      if (!paystackHtml.toLowerCase().includes("paystack")) throw new Error("Paystack authorization page did not render in Chrome.");
      console.log(JSON.stringify({
        title: candidate.title,
        productId: candidate.productId,
        sourceVariantId: candidate.sourceVariantId,
        pdp: pdp.status,
        cart: cart.status,
        checkout: checkout.status,
        staleAgeMinutes: Math.floor((Date.now() - candidate.freshness.getTime()) / 60_000),
        paystackOpened: true,
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
