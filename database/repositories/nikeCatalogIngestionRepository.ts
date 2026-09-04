import { and, eq, notInArray, sql } from "drizzle-orm";
import type { db } from "@/database/client";
import {
  brands,
  catalogSyncErrors,
  catalogSyncRunProducts,
  catalogSyncRuns,
  productColourways,
  productImages,
  products,
  productVariants,
  storefronts,
} from "@/database/schema";
import type { NormalizedNikeProduct } from "@/lib/nike-catalog-mapper";

type Database = typeof db;

export type NikeSyncRunSource = {
  actorId: string;
  runId: string;
  datasetId: string;
  authoritative?: boolean;
};

export type NikeSyncCounts = {
  received: number;
  productsUpserted: number;
  imagesUpserted: number;
  variantsUpserted: number;
  colourwaysUpserted: number;
  productsCoalesced: number;
  errors: number;
};

export type NikeSyncRun = NikeSyncCounts & {
  syncRunId: string;
  authoritative: boolean;
  reused: boolean;
};

export type ProductWriteCounts = {
  colourways: number;
  images: number;
  variants: number;
};

const NIKE_US = {
  brand: { name: "Nike", slug: "nike", officialDomain: "nike.com" },
  storefront: {
    provider: "apify",
    sourceStorefrontId: "nike-us",
    countryCode: "US",
    locale: "en-US",
    currency: "USD",
    officialBaseUrl: "https://www.nike.com/us",
  },
} as const;

function sourceDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export class NikeCatalogIngestionRepository {
  constructor(private readonly database: Database) {}

  async ensureStorefront(): Promise<{ brandId: string; storefrontId: string }> {
    return this.database.transaction(async (tx) => {
      const [brand] = await tx.insert(brands)
        .values(NIKE_US.brand)
        .onConflictDoUpdate({
          target: brands.slug,
          set: { name: NIKE_US.brand.name, officialDomain: NIKE_US.brand.officialDomain, updatedAt: new Date() },
        })
        .returning({ id: brands.id });

      const [storefront] = await tx.insert(storefronts)
        .values({ brandId: brand.id, ...NIKE_US.storefront })
        .onConflictDoUpdate({
          target: [storefronts.provider, storefronts.sourceStorefrontId],
          set: {
            brandId: brand.id,
            countryCode: NIKE_US.storefront.countryCode,
            locale: NIKE_US.storefront.locale,
            currency: NIKE_US.storefront.currency,
            officialBaseUrl: NIKE_US.storefront.officialBaseUrl,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: storefronts.id });

      return { brandId: brand.id, storefrontId: storefront.id };
    });
  }

  async startOrReuseRun(storefrontId: string, source: NikeSyncRunSource): Promise<NikeSyncRun> {
    const [created] = await this.database.insert(catalogSyncRuns)
      .values({
        storefrontId,
        provider: "apify",
        actorId: source.actorId,
        providerRunId: source.runId,
        datasetId: source.datasetId,
        authoritative: source.authoritative ?? false,
        status: "running",
      })
      .onConflictDoNothing({ target: [catalogSyncRuns.provider, catalogSyncRuns.providerRunId] })
      .returning({ id: catalogSyncRuns.id });

    if (created) {
      return {
        syncRunId: created.id,
        authoritative: source.authoritative ?? false,
        reused: false,
        received: 0,
        productsUpserted: 0,
        imagesUpserted: 0,
        variantsUpserted: 0,
        colourwaysUpserted: 0,
        productsCoalesced: 0,
        errors: 0,
      };
    }

    const [existing] = await this.database.select().from(catalogSyncRuns).where(and(
      eq(catalogSyncRuns.provider, "apify"),
      eq(catalogSyncRuns.providerRunId, source.runId),
    )).limit(1);
    if (!existing) throw new Error("The existing Apify sync run could not be loaded.");
    if (source.authoritative !== undefined && existing.authoritative !== source.authoritative) {
      throw new Error("The stored sync run authoritative status does not match the requested run.");
    }

    return {
      syncRunId: existing.id,
      authoritative: existing.authoritative,
      reused: true,
      received: existing.productsReceived,
      productsUpserted: existing.productsUpserted,
      imagesUpserted: existing.imagesUpserted,
      variantsUpserted: existing.variantsUpserted,
      colourwaysUpserted: existing.colourwaysUpserted,
      productsCoalesced: existing.productsCoalesced,
      errors: existing.errorCount,
    };
  }

  async upsertProduct(
    syncRunId: string,
    storefrontId: string,
    brandId: string,
    normalized: NormalizedNikeProduct,
  ): Promise<ProductWriteCounts> {
    return this.database.transaction(async (tx) => {
      const product = normalized.product;
      const [canonicalMatch] = await tx.select({
        id: products.id,
        sourceProductId: products.sourceProductId,
        styleCode: products.styleCode,
      }).from(products).where(and(
        eq(products.storefrontId, storefrontId),
        eq(products.canonicalUrl, product.canonical_url),
      )).limit(1);

      let sourceProductId = normalized.sourceProductId;
      if (canonicalMatch && canonicalMatch.sourceProductId !== sourceProductId) {
        const sameStyle = Boolean(product.style_code && canonicalMatch.styleCode === product.style_code);
        if (sameStyle) sourceProductId = canonicalMatch.sourceProductId;
      }

      const now = new Date();
      const productSourceUpdatedAt = sourceDate(product.source_updated_at);
      const [savedProduct] = await tx.insert(products).values({
        storefrontId,
        brandId,
        provider: "apify",
        sourceProductId,
        styleCode: product.style_code,
        canonicalUrl: product.canonical_url,
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        productType: product.product_type,
        department: product.department,
        gender: product.gender,
        currency: product.currency,
        priceMinor: product.sale_price_minor ?? product.price_minor,
        compareAtPriceMinor: product.sale_price_minor == null ? null : product.price_minor,
        available: product.available,
        availabilityStatus: product.availability_status,
        isActive: true,
        lastSeenSyncRunId: syncRunId,
        missingSinceSyncRunId: null,
        deactivatedBySyncRunId: null,
        deactivatedAt: null,
        deactivationReason: null,
        sourceUpdatedAt: productSourceUpdatedAt,
        lastSeenAt: now,
        lastSyncedAt: now,
      }).onConflictDoUpdate({
        target: [products.provider, products.storefrontId, products.sourceProductId],
        set: {
          styleCode: product.style_code,
          canonicalUrl: product.canonical_url,
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          productType: product.product_type,
          gender: product.gender,
          currency: product.currency,
          priceMinor: product.sale_price_minor ?? product.price_minor,
          compareAtPriceMinor: product.sale_price_minor == null ? null : product.price_minor,
          available: product.available,
          availabilityStatus: product.availability_status,
          isActive: true,
          lastSeenSyncRunId: syncRunId,
          missingSinceSyncRunId: null,
          deactivatedBySyncRunId: null,
          deactivatedAt: null,
          deactivationReason: null,
          ...(productSourceUpdatedAt ? { sourceUpdatedAt: productSourceUpdatedAt } : {}),
          lastSeenAt: now,
          lastSyncedAt: now,
          updatedAt: now,
        },
      }).returning({ id: products.id });

      await tx.insert(catalogSyncRunProducts).values({
        syncRunId,
        productId: savedProduct.id,
        observedSourceProductId: normalized.sourceProductId,
        canonicalUrl: product.canonical_url,
        styleCode: product.style_code,
        observedAt: now,
      }).onConflictDoUpdate({
        target: [catalogSyncRunProducts.syncRunId, catalogSyncRunProducts.productId],
        set: {
          observedSourceProductId: normalized.sourceProductId,
          canonicalUrl: product.canonical_url,
          styleCode: product.style_code,
          observedAt: now,
        },
      });

      const colourwayIds = new Map<string, string>();
      for (const colourway of normalized.colourways) {
        const colourwaySourceUpdatedAt = sourceDate(colourway.source_updated_at);
        const [savedColourway] = await tx.insert(productColourways).values({
          productId: savedProduct.id,
          provider: "apify",
          styleColor: colourway.style_color,
          colour: colourway.colour,
          canonicalUrl: colourway.canonical_url,
          currency: colourway.currency,
          priceMinor: colourway.sale_price_minor ?? colourway.price_minor,
          compareAtPriceMinor: colourway.sale_price_minor == null ? null : colourway.price_minor,
          available: colourway.available,
          availabilityStatus: colourway.availability_status,
          primaryImageUrl: colourway.primary_image_url,
          position: colourway.position,
          isActive: true,
          sourceUpdatedAt: colourwaySourceUpdatedAt,
          lastSeenAt: now,
        }).onConflictDoUpdate({
          target: [productColourways.productId, productColourways.styleColor],
          set: {
            colour: colourway.colour,
            canonicalUrl: colourway.canonical_url,
            currency: colourway.currency,
            priceMinor: colourway.sale_price_minor ?? colourway.price_minor,
            compareAtPriceMinor: colourway.sale_price_minor == null ? null : colourway.price_minor,
            available: colourway.available,
            availabilityStatus: colourway.availability_status,
            primaryImageUrl: colourway.primary_image_url,
            position: colourway.position,
            isActive: true,
            ...(colourwaySourceUpdatedAt ? { sourceUpdatedAt: colourwaySourceUpdatedAt } : {}),
            lastSeenAt: now,
            updatedAt: now,
          },
        }).returning({ id: productColourways.id });
        colourwayIds.set(colourway.style_color, savedColourway.id);
      }
      if (normalized.colourways.length > 0) {
        await tx.update(productColourways).set({ isActive: false, updatedAt: now }).where(and(
          eq(productColourways.productId, savedProduct.id),
          notInArray(productColourways.styleColor, normalized.colourways.map((colourway) => colourway.style_color)),
        ));
      } else {
        await tx.update(productColourways).set({ isActive: false, updatedAt: now })
          .where(eq(productColourways.productId, savedProduct.id));
      }

      const uniqueImages = [...new Map(normalized.images.map((image) => [image.official_cdn_url, image])).values()];
      if (uniqueImages.length > 0) {
        await tx.insert(productImages).values(uniqueImages.map((image) => ({
            productId: savedProduct.id,
            colourwayId: image.style_color ? colourwayIds.get(image.style_color) : null,
            sourceUrl: image.official_cdn_url,
            altText: image.alt_text,
            position: image.position,
            colorName: image.color_name,
            isActive: true,
            sourceUpdatedAt: sourceDate(image.source_updated_at),
          }))).onConflictDoUpdate({
          target: [productImages.productId, productImages.sourceUrl],
          set: {
            altText: sql`excluded.alt_text`,
            position: sql`excluded.position`,
            colorName: sql`excluded.color_name`,
            isActive: true,
            colourwayId: sql`excluded.colourway_id`,
            sourceUpdatedAt: sql`coalesce(excluded.source_updated_at, ${productImages.sourceUpdatedAt})`,
            updatedAt: now,
          },
        });
      }
      if (uniqueImages.length > 0) {
        await tx.update(productImages).set({ isActive: false, updatedAt: now }).where(and(
          eq(productImages.productId, savedProduct.id),
          notInArray(productImages.sourceUrl, uniqueImages.map((image) => image.official_cdn_url)),
        ));
      } else {
        await tx.update(productImages).set({ isActive: false, updatedAt: now })
          .where(eq(productImages.productId, savedProduct.id));
      }

      const uniqueVariants = [...new Map(normalized.variants.map((variant) => [variant.source_variant_id, variant])).values()];
      if (uniqueVariants.length > 0) {
        await tx.insert(productVariants).values(uniqueVariants.map((variant) => ({
            productId: savedProduct.id,
            colourwayId: variant.style_color ? colourwayIds.get(variant.style_color) : null,
            provider: "apify",
            sourceVariantId: variant.source_variant_id,
            sku: variant.sku,
            gtin: variant.gtin,
            title: variant.title,
            optionValues: variant.option_values,
            currency: variant.currency,
            priceMinor: variant.price_minor,
            compareAtPriceMinor: variant.sale_price_minor,
            available: variant.available,
            availabilityStatus: variant.availability_status,
            isActive: true,
            sourceUpdatedAt: sourceDate(variant.source_updated_at),
            lastSeenAt: now,
          }))).onConflictDoUpdate({
          target: [productVariants.productId, productVariants.sourceVariantId],
          set: {
            sku: sql`excluded.sku`,
            gtin: sql`excluded.gtin`,
            title: sql`excluded.title`,
            optionValues: sql`excluded.option_values`,
            colourwayId: sql`excluded.colourway_id`,
            currency: sql`excluded.currency`,
            priceMinor: sql`excluded.price_minor`,
            compareAtPriceMinor: sql`excluded.compare_at_price_minor`,
            available: sql`excluded.available`,
            availabilityStatus: sql`excluded.availability_status`,
            isActive: true,
            sourceUpdatedAt: sql`coalesce(excluded.source_updated_at, ${productVariants.sourceUpdatedAt})`,
            lastSeenAt: now,
            updatedAt: now,
          },
        });

        await tx.update(productVariants).set({ isActive: false, updatedAt: now }).where(and(
          eq(productVariants.productId, savedProduct.id),
          notInArray(productVariants.sourceVariantId, uniqueVariants.map((variant) => variant.source_variant_id)),
        ));
      } else {
        await tx.update(productVariants).set({ isActive: false, updatedAt: now })
          .where(eq(productVariants.productId, savedProduct.id));
      }

      return {
        colourways: normalized.colourways.length,
        images: uniqueImages.length,
        variants: uniqueVariants.length,
      };
    });
  }

  async recordError(input: {
    syncRunId: string;
    sourceProductId?: string;
    stage: string;
    errorCode: string;
    errorMessage: string;
  }): Promise<void> {
    await this.database.insert(catalogSyncErrors).values(input);
  }

  async completeRun(syncRunId: string, counts: NikeSyncCounts): Promise<void> {
    const status = counts.errors === 0 ? "succeeded" : counts.productsUpserted > 0 ? "partial" : "failed";
    await this.database.update(catalogSyncRuns).set({
      status,
      completedAt: new Date(),
      productsReceived: counts.received,
      productsUpserted: counts.productsUpserted,
      imagesUpserted: counts.imagesUpserted,
      variantsUpserted: counts.variantsUpserted,
      colourwaysUpserted: counts.colourwaysUpserted,
      productsCoalesced: counts.productsCoalesced,
      errorCount: counts.errors,
      updatedAt: new Date(),
    }).where(eq(catalogSyncRuns.id, syncRunId));
  }

  async failRun(syncRunId: string, errorCount: number): Promise<void> {
    await this.database.update(catalogSyncRuns).set({
      status: "failed",
      completedAt: new Date(),
      errorCount,
      updatedAt: new Date(),
    }).where(eq(catalogSyncRuns.id, syncRunId));
  }
}
