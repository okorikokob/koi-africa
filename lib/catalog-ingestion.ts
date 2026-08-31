import { db } from "@/database/client";
import { NikeCatalogIngestionRepository } from "@/database/repositories/nikeCatalogIngestionRepository";
import { getApifyDatasetItems } from "@/lib/apify-client";
import { ingestNikeSource } from "@/lib/nike-catalog-ingestion";

const repository = new NikeCatalogIngestionRepository(db);

export async function ingestNikeDataset(
  datasetId: string,
  source: { actorId: string; runId: string },
) {
  return ingestNikeSource(
    { ...source, datasetId },
    repository,
    () => getApifyDatasetItems(datasetId),
  );
}
