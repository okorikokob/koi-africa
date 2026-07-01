// Fetches the vendor Shopify store's product.js to get ALL variants + per-color images.
// Only works for Shopify storefronts (which is everything in our catalog).
// Called server-side from the product detail page — no CORS issues.

import type { ProductVariant } from "@/lib/shopify-catalog";

type ShopifyJsVariant = {
  id: number;
  title: string;
  option1: string | null;   // usually Color
  option2: string | null;   // usually Size
  option3: string | null;
  available: boolean;
  price: string;            // cents as string e.g. "8999"
  compare_at_price: string | null;
};

type ShopifyJsImage = {
  id: number;
  src: string;
  variant_ids: number[];
};

type ShopifyJsProduct = {
  id: number;
  title: string;
  handle: string;
  options: Array<{ name: string; position: number }>;
  variants: ShopifyJsVariant[];
  images: ShopifyJsImage[];
};

export type VendorEnrichment = {
  colorImageSets: Record<string, string[]>;   // colorName → image URLs
  colorImages: Record<string, string>;         // colorName → first image URL
  allImages: string[];
  variants: ProductVariant[];
};

// Derives the product.js URL from a product page URL like:
// https://shopnouveau.com/products/9060-thunder-brown?variant=123
// Returns null for cart URLs (/cart/123:1) — they have no product handle.
function productJsUrl(variantUrl: string): string | null {
  try {
    const u = new URL(variantUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const handleIdx = parts.indexOf("products");
    if (handleIdx === -1 || !parts[handleIdx + 1]) return null;
    const handle = parts[handleIdx + 1].split("?")[0];
    return `${u.origin}/products/${handle}.js`;
  } catch {
    return null;
  }
}

export async function fetchVendorEnrichment(
  variantUrl: string,
  currency: string,
): Promise<VendorEnrichment | null> {
  const jsUrl = productJsUrl(variantUrl);
  if (!jsUrl) {
    console.warn(`[KOI vendor-product] Cannot derive .js URL from: ${variantUrl}`);
    return null;
  }

  // 8-second timeout so the product page doesn't hang if a vendor is slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(jsUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/javascript, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[KOI vendor-product] ${jsUrl} → HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as ShopifyJsProduct;

    if (!data?.variants?.length) {
      console.warn(`[KOI vendor-product] ${jsUrl} returned no variants`);
      return null;
    }

    // Determine which option position is Color/Colour (usually option1 = position 1)
    const colorPos = data.options.find(
      (o) => o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour",
    )?.position ?? 1;
    const sizePos = data.options.find(
      (o) => o.name.toLowerCase() === "size",
    )?.position ?? 2;

    const getOption = (v: ShopifyJsVariant, pos: number): string => {
      if (pos === 1) return v.option1 ?? "";
      if (pos === 2) return v.option2 ?? "";
      return v.option3 ?? "";
    };

    // Build variant id → color lookup
    const variantColor = new Map<number, string>();
    for (const v of data.variants) {
      variantColor.set(v.id, getOption(v, colorPos));
    }

    // Build colorImageSets using variant_ids on each image
    const colorImageSets: Record<string, string[]> = {};
    const allImages: string[] = [];
    const seenImgs = new Set<string>();

    for (const img of data.images) {
      const src = img.src.split("?")[0]; // strip CDN query params for stable keys
      if (!seenImgs.has(src)) { seenImgs.add(src); allImages.push(src); }

      // Images with no variant_ids are generic product shots — add to allImages but not per-color
      if (!img.variant_ids?.length) continue;

      const colorsForImg = new Set<string>();
      for (const vid of img.variant_ids) {
        const color = variantColor.get(vid);
        if (color) colorsForImg.add(color);
      }
      for (const color of colorsForImg) {
        if (!colorImageSets[color]) colorImageSets[color] = [];
        if (!colorImageSets[color].includes(src)) colorImageSets[color].push(src);
      }
    }

    // colorImages: first image per color
    const colorImages: Record<string, string> = {};
    for (const [color, imgs] of Object.entries(colorImageSets)) {
      if (imgs[0]) colorImages[color] = imgs[0];
    }

    // Build full variants array with variant-specific URLs
    const origin = new URL(variantUrl).origin;
    const handle = data.handle;
    const variants: ProductVariant[] = data.variants.map((v) => {
      const color = getOption(v, colorPos);
      const size = getOption(v, sizePos);
      const options = [
        ...(color ? [{ name: "Color", label: color }] : []),
        ...(size ? [{ name: "Size", label: size }] : []),
      ];
      return {
        id: String(v.id),
        checkoutUrl: `${origin}/cart/${v.id}:1`,
        productUrl: `${origin}/products/${handle}?variant=${v.id}`,
        available: v.available,
        price: parseInt(v.price, 10) / 100,
        currency,
        options,
        imageUrl: colorImages[color] ?? allImages[0] ?? "",
      };
    });

    console.log(`[KOI vendor-product] ✓ ${handle}: ${variants.length} variants, ${Object.keys(colorImageSets).length} colors, ${allImages.length} images`);
    return { colorImageSets, colorImages, allImages, variants };

  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[KOI vendor-product] fetch threw for ${jsUrl}: ${msg}`);
    return null;
  }
}
