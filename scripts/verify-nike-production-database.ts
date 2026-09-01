import { createHash } from "node:crypto";
import postgres from "postgres";

function required(name: "SOURCE_DATABASE_URL" | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function digest(rows: unknown[]): string {
  const normalized = rows.map((row) => JSON.stringify(row, (_key, value) => (
    value instanceof Date ? value.toISOString() : value
  ))).sort();
  return createHash("sha256").update(normalized.join("\n")).digest("hex");
}

async function catalogueSnapshot(sql: ReturnType<typeof postgres>) {
  const [products, colourways, images, variants] = await Promise.all([
    sql`select p.* from products p join storefronts s on s.id = p.storefront_id where s.source_storefront_id = 'nike-us' order by p.id`,
    sql`select c.* from product_colourways c join products p on p.id = c.product_id join storefronts s on s.id = p.storefront_id where s.source_storefront_id = 'nike-us' order by c.id`,
    sql`select i.* from product_images i join products p on p.id = i.product_id join storefronts s on s.id = p.storefront_id where s.source_storefront_id = 'nike-us' order by i.id`,
    sql`select v.* from product_variants v join products p on p.id = v.product_id join storefronts s on s.id = p.storefront_id where s.source_storefront_id = 'nike-us' order by v.id`,
  ]);
  return {
    counts: { products: products.length, colourways: colourways.length, images: images.length, variants: variants.length },
    digests: { products: digest(products), colourways: digest(colourways), images: digest(images), variants: digest(variants) },
  };
}

async function main(): Promise<void> {
  const source = postgres(required("SOURCE_DATABASE_URL"), { max: 1, prepare: false });
  const target = postgres(required("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const [sourceSnapshot, targetSnapshot, migrations, integrity] = await Promise.all([
      catalogueSnapshot(source),
      catalogueSnapshot(target),
      target<{ count: number }[]>`select count(*)::integer as count from public.__koi_migrations`,
      target<Array<Record<string, number>>>`
        with nike_products as (
          select p.* from products p join storefronts s on s.id = p.storefront_id
          where p.provider = 'apify' and s.source_storefront_id = 'nike-us'
        ), nike_variants as (
          select v.* from product_variants v join nike_products p on p.id = v.product_id
        )
        select
          (select count(*)::int from nike_products where is_active) as "activeProducts",
          (select count(*)::int from nike_products where not is_active) as "inactiveProducts",
          (select count(*)::int from nike_variants where is_active) as "activeVariants",
          (select count(*)::int from nike_products where price_minor <= 0) as "invalidProductPrices",
          (select count(*)::int from nike_variants where price_minor is not null and price_minor <= 0) as "invalidVariantPrices",
          (select count(*)::int from nike_products where available <> (availability_status in ('in_stock','limited','pre_order'))) as "productAvailabilityMismatches",
          (select count(*)::int from nike_variants where available <> (availability_status in ('in_stock','limited','pre_order'))) as "variantAvailabilityMismatches",
          (select count(*)::int from nike_variants v left join nike_products p on p.id = v.product_id where p.id is null) as "orphanVariants",
          (select count(*)::int from product_images i join nike_products p on p.id = i.product_id left join product_colourways c on c.id = i.colourway_id where i.colourway_id is not null and c.id is null) as "orphanImageColourways",
          (select count(*)::int from nike_variants v left join product_colourways c on c.id = v.colourway_id where v.colourway_id is not null and c.id is null) as "orphanVariantColourways",
          (select count(*)::int from (select product_id, source_variant_id from nike_variants group by product_id, source_variant_id having count(*) > 1) d) as "duplicateExactVariants",
          (select count(distinct p.id)::int from nike_products p join nike_variants v on v.product_id = p.id where p.is_active and v.is_active and p.availability_status in ('in_stock','limited','pre_order') and v.availability_status in ('in_stock','limited','pre_order') and coalesce(v.price_minor, p.price_minor) > 0) as "checkoutCandidateProducts",
          (select count(*)::int from nike_variants v join nike_products p on p.id = v.product_id where p.is_active and v.is_active and p.availability_status in ('in_stock','limited','pre_order') and v.availability_status in ('in_stock','limited','pre_order') and coalesce(v.price_minor, p.price_minor) > 0) as "checkoutCandidateVariants"
      `,
    ]);

    const row = integrity[0];
    if (!row) throw new Error("Integrity query returned no result.");
    if (migrations[0]?.count !== 9) throw new Error(`Expected 9 migrations, found ${migrations[0]?.count ?? 0}.`);
    if (JSON.stringify(sourceSnapshot) !== JSON.stringify(targetSnapshot)) {
      throw new Error("The Neon Nike catalogue does not exactly match the verified source snapshot.");
    }
    const failureFields = [
      "invalidProductPrices", "invalidVariantPrices", "productAvailabilityMismatches",
      "variantAvailabilityMismatches", "orphanVariants", "orphanImageColourways",
      "orphanVariantColourways", "duplicateExactVariants",
    ].filter((field) => row[field] !== 0);
    if (failureFields.length) throw new Error(`Integrity failures: ${failureFields.join(", ")}.`);
    if (row.checkoutCandidateProducts < 1 || row.checkoutCandidateVariants < 1) {
      throw new Error("No authoritative Nike checkout candidates were found.");
    }

    console.log(JSON.stringify({
      migrations: migrations[0].count,
      exactSourceMatch: true,
      ...targetSnapshot,
      integrity: row,
    }, null, 2));
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

main().catch((error) => {
  console.error("[verify-nike-production-database]", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
