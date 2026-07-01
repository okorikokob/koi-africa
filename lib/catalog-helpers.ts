import type { ShopifyProduct } from "@/lib/shopify-catalog";
import type { Product } from "@/types";

export function toKoiProduct(p: ShopifyProduct, category = "fashion"): Product {
  return {
    id: p.id,
    title: p.title,
    brandName: p.vendorName,
    category,
    imageUrl: p.imageUrl,
    priceAmount: p.price,
    priceCurrency: p.currency,
    vendorName: p.vendorName,
    vendorUrl: p.checkoutUrl,
    isFeatured: true,
    description: p.description || undefined,
    allImages: p.allImages.length > 0 ? p.allImages : undefined,
    colorImages: Object.keys(p.colorImages).length > 0 ? p.colorImages : undefined,
    colorImageSets: Object.keys(p.colorImageSets).length > 0 ? p.colorImageSets : undefined,
    productPageUrl: p.productPageUrl || undefined,
    rating: p.rating,
    reviewCount: p.reviewCount,
    variants: p.variants.length > 0 ? p.variants : undefined,
    options: p.options.length > 0 ? p.options : undefined,
  };
}
