import { loadEnvConfig } from "@next/env";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  brands,
  catalogSyncErrors,
  catalogSyncRunProducts,
  catalogSyncRuns,
  categories,
  productColourways,
  productImages,
  productOverrides,
  products,
  productVariants,
  storefronts,
} from "@/database/schema";
import * as schema from "@/database/schema";

loadEnvConfig(process.cwd());

function required(name: "SOURCE_DATABASE_URL" | "TARGET_DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const sourceClient = postgres(required("SOURCE_DATABASE_URL"), { max: 1, prepare: false });
  const targetClient = postgres(required("TARGET_DATABASE_URL"), { max: 1, prepare: false });
  const source = drizzle(sourceClient, { schema });
  const target = drizzle(targetClient, { schema });

  try {
    const [nikeStorefront] = await source.select().from(storefronts).where(and(
      eq(storefronts.provider, "apify"),
      eq(storefronts.sourceStorefrontId, "nike-us"),
    )).limit(1);
    if (!nikeStorefront) throw new Error("The source Nike storefront was not found.");

    const [nikeBrand] = await source.select().from(brands)
      .where(eq(brands.id, nikeStorefront.brandId)).limit(1);
    if (!nikeBrand) throw new Error("The source Nike brand was not found.");

    const sourceProducts = await source.select().from(products)
      .where(eq(products.storefrontId, nikeStorefront.id));
    if (sourceProducts.length === 0) throw new Error("The source Nike catalogue is empty.");

    const productIds = sourceProducts.map((product) => product.id);
    const categoryIds = [...new Set(sourceProducts.flatMap((product) => product.categoryId ? [product.categoryId] : []))];
    const [sourceCategories, sourceColourways, sourceImages, sourceVariants, sourceOverrides, sourceRuns] = await Promise.all([
      categoryIds.length ? source.select().from(categories).where(inArray(categories.id, categoryIds)) : [],
      source.select().from(productColourways).where(inArray(productColourways.productId, productIds)),
      source.select().from(productImages).where(inArray(productImages.productId, productIds)),
      source.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
      source.select().from(productOverrides).where(inArray(productOverrides.productId, productIds)),
      source.select().from(catalogSyncRuns).where(eq(catalogSyncRuns.storefrontId, nikeStorefront.id)),
    ]);
    const runIds = sourceRuns.map((run) => run.id);
    const [sourceRunProducts, sourceSyncErrors] = await Promise.all([
      runIds.length ? source.select().from(catalogSyncRunProducts).where(inArray(catalogSyncRunProducts.syncRunId, runIds)) : [],
      runIds.length ? source.select().from(catalogSyncErrors).where(inArray(catalogSyncErrors.syncRunId, runIds)) : [],
    ]);

    await target.transaction(async (tx) => {
      const existing = await tx.select({ id: storefronts.id }).from(storefronts).where(and(
        eq(storefronts.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
      )).limit(1);
      if (existing.length) throw new Error("The target already contains a Nike storefront; migration aborted.");

      await tx.insert(brands).values(nikeBrand);
      await tx.insert(storefronts).values(nikeStorefront);
      if (sourceCategories.length) await tx.insert(categories).values(sourceCategories);
      await tx.insert(products).values(sourceProducts.map((product) => ({
        ...product,
        lastSeenSyncRunId: null,
        missingSinceSyncRunId: null,
        deactivatedBySyncRunId: null,
      })));
      for (let index = 0; index < sourceColourways.length; index += 500) {
        await tx.insert(productColourways).values(sourceColourways.slice(index, index + 500));
      }
      for (let index = 0; index < sourceImages.length; index += 500) {
        await tx.insert(productImages).values(sourceImages.slice(index, index + 500));
      }
      for (let index = 0; index < sourceVariants.length; index += 500) {
        await tx.insert(productVariants).values(sourceVariants.slice(index, index + 500));
      }
      if (sourceOverrides.length) await tx.insert(productOverrides).values(sourceOverrides);
      if (sourceRuns.length) await tx.insert(catalogSyncRuns).values(sourceRuns);

      for (const product of sourceProducts) {
        if (!product.lastSeenSyncRunId && !product.missingSinceSyncRunId && !product.deactivatedBySyncRunId) continue;
        await tx.update(products).set({
          lastSeenSyncRunId: product.lastSeenSyncRunId,
          missingSinceSyncRunId: product.missingSinceSyncRunId,
          deactivatedBySyncRunId: product.deactivatedBySyncRunId,
        }).where(eq(products.id, product.id));
      }

      for (let index = 0; index < sourceRunProducts.length; index += 500) {
        await tx.insert(catalogSyncRunProducts).values(sourceRunProducts.slice(index, index + 500));
      }
      for (let index = 0; index < sourceSyncErrors.length; index += 500) {
        await tx.insert(catalogSyncErrors).values(sourceSyncErrors.slice(index, index + 500));
      }
    });

    console.log(JSON.stringify({
      brand: nikeBrand.slug,
      storefront: nikeStorefront.sourceStorefrontId,
      products: sourceProducts.length,
      activeProducts: sourceProducts.filter((product) => product.isActive).length,
      inactiveProducts: sourceProducts.filter((product) => !product.isActive).length,
      categories: sourceCategories.length,
      colourways: sourceColourways.length,
      activeColourways: sourceColourways.filter((colourway) => colourway.isActive).length,
      images: sourceImages.length,
      variants: sourceVariants.length,
      activeVariants: sourceVariants.filter((variant) => variant.isActive).length,
      overrides: sourceOverrides.length,
      syncRuns: sourceRuns.length,
      syncRunProducts: sourceRunProducts.length,
      syncErrors: sourceSyncErrors.length,
    }, null, 2));
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()]);
  }
}

main().catch((error) => {
  const details = error instanceof Error
    ? { name: error.name, message: error.message, cause: error.cause instanceof Error ? error.cause.message : undefined }
    : { message: String(error) };
  console.error("[migrate-nike-catalog-to-postgres]", details);
  process.exitCode = 1;
});
