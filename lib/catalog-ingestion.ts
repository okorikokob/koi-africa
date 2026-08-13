import { getApifyDatasetItems } from "@/lib/apify-client";
import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";
import {
  callCatalogRpc,
  getCatalogRows,
  insertCatalogRow,
  updateCatalogRow,
  upsertCatalogRow,
} from "@/lib/insforge-admin";
import { mapNikeProductRecord } from "@/lib/nike-catalog-mapper";

const NIKE_US = {
  brand: { name: "Nike", slug: "nike", official_domain: "nike.com" },
  storefront: {
    provider: "apify",
    source_storefront_id: "nike-us",
    country_code: "US",
    locale: "en-US",
    currency: "USD",
    official_base_url: "https://www.nike.com/us",
  },
} as const;

type IngestionResult = {
  syncRunId: string;
  received: number;
  productsUpserted: number;
  imagesUpserted: number;
  variantsUpserted: number;
  productsCoalesced: number;
  errors: number;
};

type IdRow = { id: string };
type ExistingProductRow = {
  source_product_id: string;
  style_code: string | null;
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function ensureNikeUsStorefront(): Promise<string> {
  const brand = await upsertCatalogRow<IdRow>("catalog_brands", "slug", NIKE_US.brand);
  const storefront = await upsertCatalogRow<IdRow>("catalog_storefronts", "provider,source_storefront_id", {
    brand_id: brand.id,
    ...NIKE_US.storefront,
  });
  return storefront.id;
}

export async function ingestNikeDataset(
  datasetId: string,
  source: { actorId: string; runId: string },
): Promise<IngestionResult> {
  const storefrontId = await ensureNikeUsStorefront();
  const syncRun = await insertCatalogRow<IdRow>("catalog_sync_runs", {
      storefront_id: storefrontId,
      provider: "apify",
      actor_id: source.actorId,
      provider_run_id: source.runId,
      dataset_id: datasetId,
      authoritative: false,
      status: "running",
  });
  const syncRunId = syncRun.id;
  let productsUpserted = 0;
  let imagesUpserted = 0;
  let variantsUpserted = 0;
  let productsCoalesced = 0;
  let errors = 0;
  const seenCanonicalProducts = new Set<string>();

  try {
    const records = await getApifyDatasetItems(datasetId);
    for (const rawRecord of records) {
      const parsed = apifyNikeProductRecordSchema.safeParse(rawRecord);
      if (!parsed.success) {
        errors += 1;
        await insertCatalogRow("catalog_sync_errors", {
          sync_run_id: syncRunId,
          stage: "validation",
          error_code: "INVALID_PRODUCT_RECORD",
          error_message: parsed.error.issues.map((issue) => issue.message).join("; ").slice(0, 4000),
        });
        continue;
      }

      try {
        const normalized = mapNikeProductRecord(parsed.data);
        const canonicalIdentity = `${parsed.data.canonicalUrl}\u0000${parsed.data.styleCode ?? ""}`;
        if (seenCanonicalProducts.has(canonicalIdentity)) {
          productsCoalesced += 1;
          continue;
        }

        const existingCanonicalProducts = await getCatalogRows<ExistingProductRow>("catalog_products", {
          storefront_id: `eq.${storefrontId}`,
          canonical_url: `eq.${parsed.data.canonicalUrl}`,
          select: "source_product_id,style_code",
          limit: "1",
        });
        const existingCanonicalProduct = existingCanonicalProducts[0];
        if (
          existingCanonicalProduct
          && existingCanonicalProduct.source_product_id !== normalized.sourceProductId
        ) {
          const sameStyleIdentity = Boolean(
            parsed.data.styleCode
            && existingCanonicalProduct.style_code
            && parsed.data.styleCode === existingCanonicalProduct.style_code,
          );
          if (!sameStyleIdentity) {
            throw new Error("Canonical URL belongs to a different established product identity.");
          }
          normalized.sourceProductId = existingCanonicalProduct.source_product_id;
        }

        await callCatalogRpc("catalog_ingest_product", {
          p_storefront_id: storefrontId,
          p_provider: "apify",
          p_source_product_id: normalized.sourceProductId,
          p_product: normalized.product,
          p_images: normalized.images,
          p_variants: normalized.variants,
        });
        productsUpserted += 1;
        imagesUpserted += normalized.images.length;
        variantsUpserted += normalized.variants.length;
        seenCanonicalProducts.add(canonicalIdentity);
      } catch (error) {
        errors += 1;
        await insertCatalogRow("catalog_sync_errors", {
          sync_run_id: syncRunId,
          source_product_id: parsed.data.sourceProductId,
          stage: "product_upsert",
          error_code: "PRODUCT_INGEST_FAILED",
          error_message: message(error).slice(0, 4000),
        });
      }
    }

    const status = errors === 0 ? "succeeded" : productsUpserted > 0 ? "partial" : "failed";
    await updateCatalogRow("catalog_sync_runs", syncRunId, {
      status,
      completed_at: new Date().toISOString(),
      products_received: records.length,
      products_upserted: productsUpserted,
      images_upserted: imagesUpserted,
      variants_upserted: variantsUpserted,
      error_count: errors,
    });

    return {
      syncRunId,
      received: records.length,
      productsUpserted,
      imagesUpserted,
      variantsUpserted,
      productsCoalesced,
      errors,
    };
  } catch (error) {
    await updateCatalogRow("catalog_sync_runs", syncRunId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_count: errors + 1,
    });
    throw error;
  }
}
