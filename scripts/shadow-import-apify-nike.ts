import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { productColourways, products, productImages, productVariants, storefronts } from "@/database/schema";
import { NikeCatalogIngestionRepository } from "@/database/repositories/nikeCatalogIngestionRepository";
import { getApifyDatasetItems, resolveLatestSuccessfulNikeRun } from "@/lib/apify-client";
import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";
import { ingestNikeSource } from "@/lib/nike-catalog-ingestion";
import { mapNikeProductRecord } from "@/lib/nike-catalog-mapper";

loadEnvConfig(process.cwd());

const sampleSize = 5;
const mappingRevision = "verified-colourways-v5";

function requiredEnvironmentVariable(name: "APIFY_NIKE_ACTOR_ID" | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const actorId = requiredEnvironmentVariable("APIFY_NIKE_ACTOR_ID");
const connectionString = requiredEnvironmentVariable("DATABASE_URL");

async function main(): Promise<void> {
  const client = postgres(connectionString, { max: 1, prepare: false });
  const database = drizzle(client, { schema });
  const repository = new NikeCatalogIngestionRepository(database);

  try {
  const requestedRunId = process.env.APIFY_NIKE_RUN_ID;
  const requestedDatasetId = process.env.APIFY_NIKE_DATASET_ID;
  if (Boolean(requestedRunId) !== Boolean(requestedDatasetId)) {
    throw new Error("APIFY_NIKE_RUN_ID and APIFY_NIKE_DATASET_ID must be provided together.");
  }
  const run = requestedRunId && requestedDatasetId
    ? { actorId, runId: requestedRunId, datasetId: requestedDatasetId }
    : await resolveLatestSuccessfulNikeRun(actorId);
  const rawRecords = await getApifyDatasetItems(run.datasetId);

  const sample = await ingestNikeSource(
    { ...run, runId: `${run.runId}:shadow-sample:${sampleSize}:${mappingRevision}` },
    repository,
    async () => rawRecords.slice(0, sampleSize),
  );
  console.log("Small shadow import", sample);

  const full = await ingestNikeSource(
    { ...run, runId: `${run.runId}:shadow:${mappingRevision}` },
    repository,
    async () => rawRecords,
  );
  console.log("Full shadow import", full);

  const validRecords = rawRecords.flatMap((record) => {
    const parsed = apifyNikeProductRecordSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
  const expectedByCanonical = new Map<string, ReturnType<typeof mapNikeProductRecord>>();
  for (const record of validRecords) {
    const identity = `${record.canonicalUrl}\u0000${record.styleCode ?? ""}`;
    if (!expectedByCanonical.has(identity)) {
      expectedByCanonical.set(identity, mapNikeProductRecord(record));
    }
  }
  const expected = [...expectedByCanonical.values()];

  const [storefront] = await database.select({ id: storefronts.id }).from(storefronts).where(and(
    eq(storefronts.provider, "apify"),
    eq(storefronts.sourceStorefrontId, "nike-us"),
  )).limit(1);
  if (!storefront) throw new Error("Nike storefront was not stored.");

  const storedProducts = await database.select().from(products).where(eq(products.storefrontId, storefront.id));
  const storedProductIds = new Set(storedProducts.map((product) => product.id));
  const storedVariants = (await database.select().from(productVariants))
    .filter((variant) => storedProductIds.has(variant.productId));
  const storedImages = (await database.select().from(productImages))
    .filter((image) => storedProductIds.has(image.productId));
  const storedColourways = (await database.select().from(productColourways))
    .filter((colourway) => storedProductIds.has(colourway.productId));
  const expectedBySource = new Map(expected.map((product) => [product.sourceProductId, product]));
  const missingProducts = [...expectedBySource.keys()].filter(
    (sourceId) => !storedProducts.some((product) => product.sourceProductId === sourceId),
  );
  const productQualityMismatches = storedProducts.flatMap((stored) => {
    const source = expectedBySource.get(stored.sourceProductId);
    if (!source) return [];
    const expectedPrice = source.product.sale_price_minor ?? source.product.price_minor;
    return stored.priceMinor !== expectedPrice
      || stored.available !== source.product.available
      || stored.availabilityStatus !== source.product.availability_status
      ? [stored.sourceProductId]
      : [];
  });

  const comparison = {
    source: {
      records: rawRecords.length,
      validRecords: validRecords.length,
      expectedProducts: expected.length,
      expectedColourways: expected.reduce((sum, product) => sum + product.colourways.length, 0),
      expectedVariants: expected.reduce((sum, product) => sum + new Set(product.variants.map((v) => v.source_variant_id)).size, 0),
      expectedImages: expected.reduce((sum, product) => sum + new Set(product.images.map((i) => i.official_cdn_url)).size, 0),
    },
    postgres: {
      products: storedProducts.length,
      activeColourways: storedColourways.filter((colourway) => colourway.isActive).length,
      activeVariants: storedVariants.filter((variant) => variant.isActive).length,
      images: storedImages.length,
    },
    quality: {
      missingProducts: missingProducts.length,
      priceOrAvailabilityMismatches: productQualityMismatches.length,
      inconsistentProductAvailability: storedProducts.filter(
        (product) => product.available !== ["in_stock", "limited", "pre_order"].includes(product.availabilityStatus),
      ).length,
      inconsistentVariantAvailability: storedVariants.filter(
        (variant) => variant.available !== ["in_stock", "limited", "pre_order"].includes(variant.availabilityStatus),
      ).length,
      orphanedColourwayImages: storedImages.filter(
        (image) => image.colourwayId && !storedColourways.some(
          (colourway) => colourway.id === image.colourwayId && colourway.isActive,
        ),
      ).length,
      orphanedColourwayVariants: storedVariants.filter(
        (variant) => variant.isActive && variant.colourwayId && !storedColourways.some(
          (colourway) => colourway.id === variant.colourwayId && colourway.isActive,
        ),
      ).length,
      populatedMeasurements: storedProducts.filter(
        (product) => product.weightGrams || product.lengthMm || product.widthMm || product.heightMm,
      ).length + storedVariants.filter(
        (variant) => variant.weightGrams || variant.lengthMm || variant.widthMm || variant.heightMm,
      ).length,
    },
  };
  console.log("Source/PostgreSQL comparison", comparison);

  if (missingProducts.length || productQualityMismatches.length) {
    process.exitCode = 1;
  }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
