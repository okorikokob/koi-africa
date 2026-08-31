import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";
import { mapNikeProductRecord, type NormalizedNikeProduct } from "@/lib/nike-catalog-mapper";
import type {
  NikeSyncCounts,
  NikeSyncRun,
  NikeSyncRunSource,
  ProductWriteCounts,
} from "@/database/repositories/nikeCatalogIngestionRepository";

export interface NikeIngestionRepository {
  ensureStorefront(): Promise<{ brandId: string; storefrontId: string }>;
  startOrReuseRun(storefrontId: string, source: NikeSyncRunSource): Promise<NikeSyncRun>;
  upsertProduct(
    syncRunId: string,
    storefrontId: string,
    brandId: string,
    product: NormalizedNikeProduct,
  ): Promise<ProductWriteCounts>;
  recordError(input: {
    syncRunId: string;
    sourceProductId?: string;
    stage: string;
    errorCode: string;
    errorMessage: string;
  }): Promise<void>;
  completeRun(syncRunId: string, counts: NikeSyncCounts): Promise<void>;
  failRun(syncRunId: string, errorCount: number): Promise<void>;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 4000);
}

export async function ingestNikeSource(
  source: NikeSyncRunSource,
  repository: NikeIngestionRepository,
  loadRecords: () => Promise<unknown[]>,
): Promise<NikeSyncRun> {
  const { brandId, storefrontId } = await repository.ensureStorefront();
  const run = await repository.startOrReuseRun(storefrontId, source);
  if (run.reused) return run;

  const counts: NikeSyncCounts = {
    received: 0,
    productsUpserted: 0,
    imagesUpserted: 0,
    variantsUpserted: 0,
    colourwaysUpserted: 0,
    productsCoalesced: 0,
    errors: 0,
  };
  const seenCanonicalProducts = new Set<string>();

  try {
    const records = await loadRecords();
    counts.received = records.length;

    for (const rawRecord of records) {
      const parsed = apifyNikeProductRecordSchema.safeParse(rawRecord);
      if (!parsed.success) {
        counts.errors += 1;
        await repository.recordError({
          syncRunId: run.syncRunId,
          stage: "validation",
          errorCode: "INVALID_PRODUCT_RECORD",
          errorMessage: parsed.error.issues.map((issue) => issue.message).join("; ").slice(0, 4000),
        });
        continue;
      }

      const canonicalIdentity = `${parsed.data.canonicalUrl}\u0000${parsed.data.styleCode ?? ""}`;
      if (seenCanonicalProducts.has(canonicalIdentity)) {
        counts.productsCoalesced += 1;
        continue;
      }

      try {
        const normalized = mapNikeProductRecord(parsed.data);
        const written = await repository.upsertProduct(run.syncRunId, storefrontId, brandId, normalized);
        counts.productsUpserted += 1;
        counts.imagesUpserted += written.images;
        counts.variantsUpserted += written.variants;
        counts.colourwaysUpserted += written.colourways;
        seenCanonicalProducts.add(canonicalIdentity);
      } catch (error) {
        counts.errors += 1;
        await repository.recordError({
          syncRunId: run.syncRunId,
          sourceProductId: parsed.data.sourceProductId,
          stage: "product_upsert",
          errorCode: "PRODUCT_INGEST_FAILED",
          errorMessage: errorMessage(error),
        });
      }
    }

    await repository.completeRun(run.syncRunId, counts);
    return {
      syncRunId: run.syncRunId,
      authoritative: run.authoritative,
      reused: false,
      ...counts,
    };
  } catch (error) {
    await repository.failRun(run.syncRunId, counts.errors + 1);
    throw error;
  }
}
