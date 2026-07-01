// Boundary between the InsForge `products` table (snake_case rows) and the
// app-facing `Product` type (camelCase). Nothing else should know the row shape.

import type { Product } from "@/types";
import type { ProductVariant } from "@/lib/shopify-catalog";

// Row shape as returned by the InsForge SDK for the `products` table.
export type ProductRow = {
  id: string;
  external_id: string | null;
  title: string;
  brand_id: string | null;
  brand_name: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  price_amount: number | string | null;
  price_currency: string | null;
  vendor_name: string | null;
  vendor_url: string | null;
  in_stock: boolean | null;
  is_featured: boolean | null;
  color_images: Record<string, string> | null;
  color_image_sets: Record<string, string[]> | null;
  variants: ProductVariant[] | null;
  options: Array<{ name: string; values: string[] }> | null;
  product_page_url: string | null;
  rating: number | string | null;
  review_count: number | null;
  tag: string | null;
  source: string | null;
};

// Row payload for insert. `id` is DB-generated; `external_id` holds the vendor id.
export type ProductInsert = Omit<ProductRow, "id" | "rating"> & {
  rating: number | null;
  synced_at?: string;
};

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : parseFloat(v);

export function rowToKoi(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    brandName: row.brand_name ?? row.vendor_name ?? "",
    category: row.category ?? "fashion",
    imageUrl: row.image_url ?? "",
    priceAmount: num(row.price_amount),
    priceCurrency: row.price_currency ?? "USD",
    vendorName: row.vendor_name ?? "",
    vendorUrl: row.vendor_url ?? "",
    isFeatured: row.is_featured ?? false,
    description: row.description ?? undefined,
    allImages: row.images?.length ? row.images : undefined,
    colorImages: row.color_images ?? undefined,
    colorImageSets: row.color_image_sets ?? undefined,
    productPageUrl: row.product_page_url ?? undefined,
    rating: row.rating != null ? num(row.rating) : undefined,
    reviewCount: row.review_count ?? undefined,
    variants: row.variants ?? undefined,
    options: row.options ?? undefined,
    tag: (row.tag as Product["tag"]) ?? undefined,
    source: (row.source as Product["source"]) ?? undefined,
  };
}

// Build an insertable row from a KOI product produced by `toKoiProduct`.
// `product.id` is the vendor (Shopify) id — stored as `external_id`.
export function koiToInsert(
  product: Product,
  extras: { category: string; isFeatured: boolean; tag?: Product["tag"]; source?: Product["source"] },
): ProductInsert {
  return {
    external_id: product.id,
    title: product.title,
    brand_id: null,
    brand_name: product.brandName,
    category: extras.category,
    description: product.description ?? null,
    image_url: product.imageUrl,
    images: product.allImages ?? (product.imageUrl ? [product.imageUrl] : []),
    price_amount: product.priceAmount,
    price_currency: product.priceCurrency,
    vendor_name: product.vendorName,
    vendor_url: product.vendorUrl,
    in_stock: true,
    is_featured: extras.isFeatured,
    color_images: product.colorImages ?? null,
    color_image_sets: product.colorImageSets ?? null,
    variants: product.variants ?? null,
    options: product.options ?? null,
    product_page_url: product.productPageUrl ?? null,
    rating: product.rating ?? null,
    review_count: product.reviewCount ?? null,
    tag: extras.tag ?? null,
    source: extras.source ?? null,
    synced_at: new Date().toISOString(),
  };
}
