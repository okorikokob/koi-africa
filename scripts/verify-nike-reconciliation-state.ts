import { loadEnvConfig } from "@next/env";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  catalogSyncRunProducts,
  catalogSyncRuns,
  productColourways,
  productImages,
  productVariants,
  products,
  storefronts,
} from "@/database/schema";

loadEnvConfig(process.cwd());

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  return value;
}

async function main(): Promise<void> {
  const providerRunId = process.env.NIKE_RECONCILIATION_PROVIDER_RUN_ID
    ?? "UNBogcWgrcqrdSAhx:shadow:verified-colourways-v5";
  const client = postgres(requiredDatabaseUrl(), { max: 1, prepare: false });
  try {
    const database = drizzle(client);
    const nikeProducts = await database.select({
      id: products.id,
      isActive: products.isActive,
      lastSeenSyncRunId: products.lastSeenSyncRunId,
      missingSinceSyncRunId: products.missingSinceSyncRunId,
      deactivatedBySyncRunId: products.deactivatedBySyncRunId,
      deactivatedAt: products.deactivatedAt,
      deactivationReason: products.deactivationReason,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .where(and(
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
      ));
    const [run] = await database.select({ id: catalogSyncRuns.id })
      .from(catalogSyncRuns)
      .where(and(
        eq(catalogSyncRuns.provider, "apify"),
        eq(catalogSyncRuns.providerRunId, providerRunId),
      ))
      .limit(1);
    const presence = run
      ? await database.select({ id: catalogSyncRunProducts.id })
          .from(catalogSyncRunProducts)
          .where(eq(catalogSyncRunProducts.syncRunId, run.id))
      : [];
    const inactiveProductIds = nikeProducts
      .filter((product) => !product.isActive)
      .map((product) => product.id);
    const [preservedVariants, preservedImages, preservedColourways] = inactiveProductIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          database.select({ id: productVariants.id }).from(productVariants)
            .where(inArray(productVariants.productId, inactiveProductIds)),
          database.select({ id: productImages.id }).from(productImages)
            .where(inArray(productImages.productId, inactiveProductIds)),
          database.select({ id: productColourways.id }).from(productColourways)
            .where(inArray(productColourways.productId, inactiveProductIds)),
        ]);
    const inactiveProducts = nikeProducts.filter((product) => !product.isActive);

    console.log(JSON.stringify({
      total: nikeProducts.length,
      active: nikeProducts.filter((product) => product.isActive).length,
      inactive: nikeProducts.filter((product) => !product.isActive).length,
      withRecordedPresence: nikeProducts.filter((product) => product.lastSeenSyncRunId !== null).length,
      markedMissing: nikeProducts.filter((product) => product.missingSinceSyncRunId !== null).length,
      withDeactivationMetadata: nikeProducts.filter((product) => (
        product.deactivatedBySyncRunId !== null
        || product.deactivatedAt !== null
        || product.deactivationReason !== null
      )).length,
      authoritativePresenceRows: presence.length,
      correctlyAttributedInactive: run ? inactiveProducts.filter((product) => (
        product.missingSinceSyncRunId === run.id
        && product.deactivatedBySyncRunId === run.id
        && product.deactivatedAt !== null
      )).length : 0,
      deactivationReasons: {
        absentFromAuthoritativeRun: inactiveProducts.filter(
          (product) => product.deactivationReason === "absent_from_authoritative_run",
        ).length,
        supersededByAuthoritativeStyleIdentity: inactiveProducts.filter(
          (product) => product.deactivationReason === "superseded_by_authoritative_style_identity",
        ).length,
      },
      preservedHistoricalChildren: {
        variants: preservedVariants.length,
        images: preservedImages.length,
        colourways: preservedColourways.length,
      },
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[verify-nike-reconciliation-state]", error);
  process.exitCode = 1;
});
