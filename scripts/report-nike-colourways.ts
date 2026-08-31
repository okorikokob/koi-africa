import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { NikeCatalogReadRepository } from "@/database/repositories/nikeCatalogReadRepository";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = postgres(connectionString, { max: 1, prepare: false });
  try {
    const repository = new NikeCatalogReadRepository(drizzle(client, { schema }));
    const rows = (await repository.listProducts()).filter((row) => row.colourways.length > 0);
    const colourways = rows.flatMap((row) => row.colourways.map((colourway) => ({
      productId: row.product.id,
      sourceProductId: row.product.sourceProductId,
      title: row.product.title,
      styleColor: colourway.styleColor,
      colour: colourway.colour,
      images: row.images.filter((image) => image.colourwayId === colourway.id).length,
      variants: row.variants.filter((variant) => variant.colourwayId === colourway.id).length,
      availability: colourway.availabilityStatus,
    })));
    const imageCounts = colourways.map((colourway) => colourway.images);
    const variantCounts = colourways.map((colourway) => colourway.variants);
    const sampleProducts = [...rows]
      .sort((left, right) => right.colourways.length - left.colourways.length)
      .slice(0, 3)
      .map((row) => ({
        id: row.product.id,
        sourceProductId: row.product.sourceProductId,
        title: row.product.title,
        totalColourways: row.colourways.length,
        colourways: colourways
          .filter((colourway) => colourway.productId === row.product.id)
          .slice(0, 3),
      }));
    console.log(JSON.stringify({
      productsWithVerifiedColourways: rows.length,
      totalVerifiedColourways: colourways.length,
      imageCountsPerColourway: {
        minimum: Math.min(...imageCounts),
        maximum: Math.max(...imageCounts),
        average: Number((imageCounts.reduce((sum, count) => sum + count, 0) / imageCounts.length).toFixed(2)),
      },
      variantCountsPerColourway: {
        minimum: Math.min(...variantCounts),
        maximum: Math.max(...variantCounts),
        average: Number((variantCounts.reduce((sum, count) => sum + count, 0) / variantCounts.length).toFixed(2)),
      },
      emptyGalleries: colourways.filter((colourway) => colourway.images === 0),
      emptyVariantSets: colourways.filter((colourway) => colourway.variants === 0),
      sampleProducts,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[report-nike-colourways]", error);
  process.exitCode = 1;
});
