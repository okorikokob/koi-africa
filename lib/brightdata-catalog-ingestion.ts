import { normalizeBrightDataNikeRecords } from "@/lib/brightdata-nike-normalizer";
import { callCatalogRpc, insertCatalogRow, updateCatalogRow, upsertCatalogRow } from "@/lib/insforge-admin";

type IdRow = { id: string };

export async function ingestBrightDataNikeRecords(raw: unknown[]) {
  const normalized = normalizeBrightDataNikeRecords(raw);
  if (normalized.rejected.length || normalized.conflicts.length) {
    throw new Error(`Bright Data import blocked: ${normalized.rejected.length} rejected, ${normalized.conflicts.length} conflicts.`);
  }

  const brand = await upsertCatalogRow<IdRow>("catalog_brands", "slug", {
    name: "Nike",
    slug: "nike",
    official_domain: "nike.com",
  });
  const storefront = await upsertCatalogRow<IdRow>("catalog_storefronts", "provider,source_storefront_id", {
    brand_id: brand.id,
    provider: "brightdata",
    source_storefront_id: "nike-us",
    country_code: "US",
    locale: "en-US",
    currency: "USD",
    official_base_url: "https://www.nike.com/us",
  });
  const syncRun = await insertCatalogRow<IdRow>("catalog_sync_runs", {
    storefront_id: storefront.id,
    provider: "brightdata",
    actor_id: "discover-by-sitemap",
    provider_run_id: `brightdata-${Date.now()}`,
    authoritative: false,
    status: "running",
  });

  try {
    for (const product of normalized.products) {
      await callCatalogRpc("catalog_ingest_brightdata_product", {
        p_storefront_id: storefront.id,
        p_source_product_id: product.sourceProductId,
        p_product: product.product,
        p_images: product.images,
        p_variants: product.variants,
      });
    }
    await updateCatalogRow("catalog_sync_runs", syncRun.id, {
      status: "succeeded",
      completed_at: new Date().toISOString(),
      products_received: normalized.stats.received,
      products_upserted: normalized.stats.products,
      images_upserted: normalized.stats.images,
      variants_upserted: normalized.stats.variants,
      error_count: 0,
    });
    return { syncRunId: syncRun.id, ...normalized.stats };
  } catch (error) {
    await updateCatalogRow("catalog_sync_runs", syncRun.id, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_count: 1,
    });
    throw error;
  }
}
