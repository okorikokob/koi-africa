import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { NikeCatalogReadRepository } from "@/database/repositories/nikeCatalogReadRepository";
import { getApifyDatasetItems, resolveLatestSuccessfulNikeRun } from "@/lib/apify-client";
import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";
import { mapNikeProductRecord } from "@/lib/nike-catalog-mapper";
import { mapNikePostgresProduct } from "@/lib/nike-postgres-product-mapper";

loadEnvConfig(process.cwd());

function requiredEnvironmentVariable(name: "APIFY_NIKE_ACTOR_ID" | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const client = postgres(requiredEnvironmentVariable("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const database = drizzle(client, { schema });
    const repository = new NikeCatalogReadRepository(database);
    const actorId = requiredEnvironmentVariable("APIFY_NIKE_ACTOR_ID");
    const requestedRunId = process.env.APIFY_NIKE_RUN_ID;
    const requestedDatasetId = process.env.APIFY_NIKE_DATASET_ID;
    if (Boolean(requestedRunId) !== Boolean(requestedDatasetId)) {
      throw new Error("APIFY_NIKE_RUN_ID and APIFY_NIKE_DATASET_ID must be provided together.");
    }
    const run = requestedRunId && requestedDatasetId
      ? { actorId, runId: requestedRunId, datasetId: requestedDatasetId }
      : await resolveLatestSuccessfulNikeRun(actorId);
    const rawRecords = await getApifyDatasetItems(run.datasetId);
    const expectedByCanonical = new Map<string, ReturnType<typeof mapNikeProductRecord>>();
    for (const rawRecord of rawRecords) {
      const parsed = apifyNikeProductRecordSchema.safeParse(rawRecord);
      if (!parsed.success) continue;
      const identity = `${parsed.data.canonicalUrl}\u0000${parsed.data.styleCode ?? ""}`;
      if (!expectedByCanonical.has(identity)) {
        expectedByCanonical.set(identity, mapNikeProductRecord(parsed.data));
      }
    }

    const rows = await repository.listProducts();
    const storedByCanonical = new Map(rows.map((row) => [
      `${row.product.canonicalUrl}\u0000${row.product.styleCode ?? ""}`,
      row,
    ]));
    const unsafeProducts: Array<{ id: string; title: string; reason: string }> = [];
    const mismatches: Array<{ sourceProductId: string; fields: string[] }> = [];

    for (const [identity, expected] of expectedByCanonical) {
      const row = storedByCanonical.get(identity);
      if (!row) {
        mismatches.push({ sourceProductId: expected.sourceProductId, fields: ["missing_product"] });
        continue;
      }
      const mapped = mapNikePostgresProduct(row);
      if (!mapped.product) {
        unsafeProducts.push({ id: row.product.id, title: row.product.title, reason: mapped.reason });
        continue;
      }

      const fields: string[] = [];
      const expectedImages = [...new Map(expected.images.map((image) => [image.official_cdn_url, image])).keys()];
      const expectedDisplayImages = expected.colourways.length > 0
        ? expected.images.filter((image) => image.style_color === expected.colourways[0].style_color)
            .map((image) => image.official_cdn_url)
        : expectedImages;
      const expectedVariants = [...new Map(expected.variants
        .filter((variant) => !variant.style_color || expected.colourways.some(
          (colourway) => colourway.style_color === variant.style_color,
        ))
        .map((variant) => [variant.source_variant_id, variant])).values()];
      const actualVariants = new Map((mapped.product.variants ?? []).map((variant) => [variant.id, variant]));
      if (mapped.product.title !== expected.product.title) fields.push("title");
      if (JSON.stringify(mapped.product.allImages) !== JSON.stringify(expectedDisplayImages)) fields.push("images");
      const expectedColorImageSets = expected.colourways.length > 0
        ? Object.fromEntries(expected.colourways.map((colourway) => [
            colourway.style_color,
            expected.images.filter((image) => image.style_color === colourway.style_color)
              .map((image) => image.official_cdn_url),
          ]))
        : Object.fromEntries([...new Set(expected.images
            .map((image) => image.color_name)
            .filter((colour): colour is string => Boolean(colour)))]
          .map((colour) => [colour, expectedImages]));
      if (JSON.stringify(mapped.product.colorImageSets) !== JSON.stringify(expectedColorImageSets)) {
        fields.push("verified_gallery_colour");
      }
      if (expected.colourways.length > 0) {
        const actualColourways = mapped.product.colourways ?? [];
        if (actualColourways.length !== expected.colourways.length) fields.push("colourway_count");
        for (const expectedColourway of expected.colourways) {
          const actual = actualColourways.find(
            (colourway) => colourway.styleColor === expectedColourway.style_color,
          );
          if (!actual) {
            fields.push(`colourway:${expectedColourway.style_color}:missing`);
            continue;
          }
          const expectedGallery = expected.images
            .filter((image) => image.style_color === expectedColourway.style_color)
            .map((image) => image.official_cdn_url);
          if (JSON.stringify(actual.images) !== JSON.stringify(expectedGallery)) {
            fields.push(`colourway:${expectedColourway.style_color}:images`);
          }
          const expectedVariantIds = expected.variants
            .filter((variant) => variant.style_color === expectedColourway.style_color)
            .map((variant) => variant.source_variant_id);
          if (JSON.stringify(actual.variantIds.sort()) !== JSON.stringify(expectedVariantIds.sort())) {
            fields.push(`colourway:${expectedColourway.style_color}:variants`);
          }
        }
      }
      if (mapped.product.priceAmount !== (expected.product.sale_price_minor ?? expected.product.price_minor) / 100) fields.push("sale_price");
      if (mapped.product.compareAtPriceAmount !== (expected.product.sale_price_minor == null ? undefined : expected.product.price_minor / 100)) fields.push("original_price");
      if (mapped.product.priceCurrency !== expected.product.currency) fields.push("currency");
      const expectedInitialAvailability = expected.colourways[0] ?? expected.product;
      if (
        mapped.product.available !== expectedInitialAvailability.available
        || mapped.product.availabilityStatus !== expectedInitialAvailability.availability_status
      ) fields.push("availability");
      if (actualVariants.size !== expectedVariants.length) fields.push("variant_count");
      for (const expectedVariant of expectedVariants) {
        const actual = actualVariants.get(expectedVariant.source_variant_id);
        if (!actual) {
          fields.push(`variant:${expectedVariant.source_variant_id}:missing`);
          continue;
        }
        if (actual.available !== expectedVariant.available || actual.availabilityStatus !== expectedVariant.availability_status) {
          fields.push(`variant:${expectedVariant.source_variant_id}:availability`);
        }
        if (actual.price !== expectedVariant.price_minor / 100 || actual.currency !== expectedVariant.currency) {
          fields.push(`variant:${expectedVariant.source_variant_id}:money`);
        }
      }
      if (fields.length > 0) mismatches.push({ sourceProductId: expected.sourceProductId, fields });
    }

    const legacyProducts = rows.filter((row) => !expectedByCanonical.has(
      `${row.product.canonicalUrl}\u0000${row.product.styleCode ?? ""}`,
    ));
    const result = {
      providerRunId: run.runId,
      datasetId: run.datasetId,
      sourceRecords: rawRecords.length,
      canonicalSourceProducts: expectedByCanonical.size,
      postgresProducts: rows.length,
      currentRunProducts: rows.length - legacyProducts.length,
      legacyProductsNotInCurrentRun: legacyProducts.map((row) => ({
        id: row.product.id,
        sourceProductId: row.product.sourceProductId,
        title: row.product.title,
      })),
      safelyRenderableProducts: rows.length - unsafeProducts.length,
      unsafeProducts,
      mismatchedProducts: mismatches.length,
      mismatches,
    };
    console.log(JSON.stringify(result, null, 2));
    if (unsafeProducts.length > 0 || mismatches.length > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[compare-nike-postgres-reads]", error);
  process.exitCode = 1;
});
