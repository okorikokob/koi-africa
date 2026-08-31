import type { NikeCatalogReadRow } from "@/database/repositories/nikeCatalogReadRepository";
import { normalizeProductOptionName } from "@/lib/product-variant-selection";
import type { Product, ProductColourway, ProductVariant } from "@/types";

export type NikeProductMappingResult =
  | { product: Product; reason: null }
  | { product: null; reason: string };

export interface NikeCatalogRowReader {
  listProducts(): Promise<NikeCatalogReadRow[]>;
  findProductById(id: string): Promise<NikeCatalogReadRow | null>;
}

const AVAILABLE_STATUSES = new Set(["in_stock", "limited", "pre_order"]);

function availabilityIsConsistent(available: boolean, status: string): boolean {
  return available === AVAILABLE_STATUSES.has(status);
}

function isUsableMoney(value: number | null): value is number {
  return value != null && Number.isSafeInteger(value) && value >= 0;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function variantColour(variant: ProductVariant): string | null {
  return variant.options.find(
    (option) => normalizeProductOptionName(option.name) === "color",
  )?.label ?? null;
}

export function mapNikePostgresProduct(row: NikeCatalogReadRow): NikeProductMappingResult {
  const source = row.product;
  const images = [...row.images]
    .filter((image) => image.sourceUrl.trim().length > 0)
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
  if (images.length === 0) return { product: null, reason: "missing_images" };
  if (!isUsableMoney(source.priceMinor)) return { product: null, reason: "invalid_product_price" };
  if (source.currency.length !== 3) return { product: null, reason: "invalid_product_currency" };
  if (!availabilityIsConsistent(source.available, source.availabilityStatus)) {
    return { product: null, reason: "inconsistent_product_availability" };
  }

  const dbColourwaysById = new Map(row.colourways.map((colourway) => [colourway.id, colourway]));
  const styleColors = new Set<string>();
  for (const colourway of row.colourways) {
    if (!colourway.styleColor.trim() || styleColors.has(colourway.styleColor)) {
      return { product: null, reason: "invalid_colourway_identity" };
    }
    styleColors.add(colourway.styleColor);
    if (!availabilityIsConsistent(colourway.available, colourway.availabilityStatus)) {
      return { product: null, reason: "inconsistent_colourway_availability" };
    }
    if (!isUsableMoney(colourway.priceMinor) || colourway.currency.length !== 3) {
      return { product: null, reason: "invalid_colourway_money" };
    }
  }

  const variantIds = new Set<string>();
  const variants: ProductVariant[] = [];
  for (const variant of row.variants) {
    if (!variant.sourceVariantId.trim() || variantIds.has(variant.sourceVariantId)) {
      return { product: null, reason: "invalid_variant_identity" };
    }
    variantIds.add(variant.sourceVariantId);
    if (!availabilityIsConsistent(variant.available, variant.availabilityStatus)) {
      return { product: null, reason: "inconsistent_variant_availability" };
    }
    const priceMinor = variant.priceMinor ?? source.priceMinor;
    if (!isUsableMoney(priceMinor) || variant.currency.length !== 3) {
      return { product: null, reason: "invalid_variant_money" };
    }
    const dbColourway = variant.colourwayId ? dbColourwaysById.get(variant.colourwayId) : undefined;
    if (variant.colourwayId && !dbColourway) {
      return { product: null, reason: "orphaned_variant_colourway" };
    }
    const options = Object.entries(variant.optionValues)
      .filter(([name, label]) => name.trim() && label.trim())
      .map(([name, label]) => ({ name: titleCase(name), label }));
    variants.push({
      id: variant.sourceVariantId,
      styleColor: dbColourway?.styleColor,
      sku: variant.sku ?? undefined,
      gtin: variant.gtin ?? undefined,
      checkoutUrl: dbColourway?.canonicalUrl ?? source.canonicalUrl,
      productUrl: dbColourway?.canonicalUrl ?? source.canonicalUrl,
      available: variant.available,
      availabilityStatus: variant.availabilityStatus,
      price: priceMinor / 100,
      currency: variant.currency,
      options,
      imageUrl: dbColourway?.primaryImageUrl ?? images[0].sourceUrl,
    });
  }

  if (row.colourways.length > 0) {
    const colourways: ProductColourway[] = [];
    for (const dbColourway of row.colourways) {
      const gallery = images
        .filter((image) => image.colourwayId === dbColourway.id)
        .map((image) => image.sourceUrl);
      const colourwayVariants = variants.filter((variant) => variant.styleColor === dbColourway.styleColor);
      if (gallery.length === 0) return { product: null, reason: "missing_colourway_gallery" };
      if (!gallery.includes(dbColourway.primaryImageUrl)) {
        return { product: null, reason: "invalid_colourway_primary_image" };
      }
      if (colourwayVariants.length === 0) return { product: null, reason: "missing_colourway_variants" };
      colourways.push({
        styleColor: dbColourway.styleColor,
        colour: dbColourway.colour,
        canonicalUrl: dbColourway.canonicalUrl,
        primaryImage: dbColourway.primaryImageUrl,
        images: gallery,
        priceAmount: dbColourway.priceMinor / 100,
        compareAtPriceAmount: dbColourway.compareAtPriceMinor == null
          ? undefined
          : dbColourway.compareAtPriceMinor / 100,
        priceCurrency: dbColourway.currency,
        available: dbColourway.available,
        availabilityStatus: dbColourway.availabilityStatus,
        variantIds: colourwayVariants.map((variant) => variant.id),
      });
    }
    const storefrontVariants = variants.filter((variant) =>
      variant.styleColor && styleColors.has(variant.styleColor)
    );
    if (storefrontVariants.some((variant) => variant.options.length === 0)) {
      return { product: null, reason: "ambiguous_required_variants" };
    }
    const initialColourway = colourways[0];
    const optionNames = [...new Set(storefrontVariants.flatMap((variant) =>
      variant.options.map((option) => option.name)
    ))];
    return {
      reason: null,
      product: {
        id: source.id,
        title: source.title,
        subtitle: source.subtitle ?? undefined,
        brandName: row.brandName,
        category: source.productType ?? "Nike",
        imageUrl: initialColourway.primaryImage,
        allImages: initialColourway.images,
        colorImages: Object.fromEntries(colourways.map((colourway) => [colourway.styleColor, colourway.primaryImage])),
        colorImageSets: Object.fromEntries(colourways.map((colourway) => [colourway.styleColor, colourway.images])),
        priceAmount: initialColourway.priceAmount,
        compareAtPriceAmount: initialColourway.compareAtPriceAmount,
        priceCurrency: initialColourway.priceCurrency,
        vendorName: row.brandName,
        vendorUrl: initialColourway.canonicalUrl,
        productPageUrl: initialColourway.canonicalUrl,
        description: source.description ?? undefined,
        isFeatured: false,
        available: initialColourway.available,
        availabilityStatus: initialColourway.availabilityStatus,
        variants: storefrontVariants,
        colourways,
        requiresVariantSelection: true,
        options: optionNames.map((name) => ({
          name,
          values: [...new Set(storefrontVariants.flatMap((variant) =>
            variant.options.filter((option) => option.name === name).map((option) => option.label)
          ))],
        })),
        source: row.countryCode === "UK" ? "UK" : "US",
      },
    };
  }

  const colorImageSets: Record<string, string[]> = {};
  for (const image of images) {
    if (!image.colorName) continue;
    colorImageSets[image.colorName] = [...(colorImageSets[image.colorName] ?? []), image.sourceUrl];
  }
  const verifiedGalleryColours = new Set(Object.keys(colorImageSets));
  const hasColourVariants = variants.some((variant) => variantColour(variant) !== null);
  if (hasColourVariants && verifiedGalleryColours.size === 0) {
    return { product: null, reason: "missing_verified_colour_gallery" };
  }
  const storefrontVariants = hasColourVariants
    ? variants.filter((variant) => {
        const colour = variantColour(variant);
        return colour !== null && verifiedGalleryColours.has(colour);
      })
    : variants;
  if (hasColourVariants && storefrontVariants.length === 0) {
    return { product: null, reason: "missing_verified_colour_variants" };
  }
  if (storefrontVariants.length > 1 && storefrontVariants.some((variant) => variant.options.length === 0)) {
    return { product: null, reason: "ambiguous_required_variants" };
  }

  const optionNames = [...new Set(storefrontVariants.flatMap((variant) => variant.options.map((option) => option.name)))];
  const colorImages = Object.fromEntries(
    Object.entries(colorImageSets).map(([color, urls]) => [color, urls[0]]),
  );

  return {
    reason: null,
    product: {
      id: source.id,
      title: source.title,
      subtitle: source.subtitle ?? undefined,
      brandName: row.brandName,
      category: source.productType ?? "Nike",
      imageUrl: images[0].sourceUrl,
      allImages: images.map((image) => image.sourceUrl),
      colorImages,
      colorImageSets,
      priceAmount: source.priceMinor / 100,
      compareAtPriceAmount: source.compareAtPriceMinor == null ? undefined : source.compareAtPriceMinor / 100,
      priceCurrency: source.currency,
      vendorName: row.brandName,
      vendorUrl: source.canonicalUrl,
      productPageUrl: source.canonicalUrl,
      description: source.description ?? undefined,
      isFeatured: false,
      available: source.available,
      availabilityStatus: source.availabilityStatus,
      variants: storefrontVariants,
      requiresVariantSelection: storefrontVariants.length > 0,
      options: optionNames.map((name) => ({
        name,
        values: [...new Set(storefrontVariants.flatMap((variant) =>
          variant.options.filter((option) => option.name === name).map((option) => option.label)
        ))],
      })),
      source: row.countryCode === "UK" ? "UK" : "US",
    },
  };
}

export class NikePostgresCatalogReader {
  constructor(private readonly repository: NikeCatalogRowReader) {}

  async listProducts(): Promise<Product[]> {
    const rows = await this.repository.listProducts();
    return rows.flatMap((row) => {
      const result = mapNikePostgresProduct(row);
      return result.product ? [result.product] : [];
    });
  }

  async findProductById(id: string): Promise<Product | null> {
    const row = await this.repository.findProductById(id);
    if (!row) return null;
    return mapNikePostgresProduct(row).product;
  }

  async listUnsafeProducts(): Promise<Array<{ id: string; title: string; reason: string }>> {
    const rows = await this.repository.listProducts();
    return rows.flatMap((row) => {
      const result = mapNikePostgresProduct(row);
      return result.reason ? [{ id: row.product.id, title: row.product.title, reason: result.reason }] : [];
    });
  }
}
