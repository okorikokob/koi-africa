import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<Array<{
      productId: string;
      title: string;
      productFreshness: Date;
      sourceVariantId: string;
      variantFreshness: Date;
    }>>`
      select distinct on (p.id)
        p.id as "productId", p.title,
        coalesce(p.source_updated_at, p.last_synced_at) as "productFreshness",
        v.source_variant_id as "sourceVariantId",
        coalesce(v.source_updated_at, v.last_seen_at) as "variantFreshness"
      from products p
      join storefronts s on s.id = p.storefront_id
      join product_variants v on v.product_id = p.id
      where p.provider = 'apify'
        and s.source_storefront_id = 'nike-us'
        and p.is_active and p.available
        and v.is_active and v.available
      order by p.id, least(
        coalesce(p.source_updated_at, p.last_synced_at),
        coalesce(v.source_updated_at, v.last_seen_at)
      ) desc
    `;
    const candidates = rows.sort((a, b) =>
      Math.min(b.productFreshness.getTime(), b.variantFreshness.getTime())
      - Math.min(a.productFreshness.getTime(), a.variantFreshness.getTime())
    ).slice(0, 5);
    console.log(JSON.stringify(candidates.map((row) => ({
      ...row,
      productFreshness: row.productFreshness.toISOString(),
      variantFreshness: row.variantFreshness.toISOString(),
      ageMinutes: Math.floor((Date.now() - Math.min(row.productFreshness.getTime(), row.variantFreshness.getTime())) / 60_000),
    })), null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
