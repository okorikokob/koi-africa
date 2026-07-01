// lib/shopify-catalog.ts
// All Shopify Global Catalog API knowledge lives here.
// Pages and routes import only the exported functions — never the raw API shape.

const SHOPIFY_MCP_URL = "https://catalog.shopify.com/api/ucp/mcp";

export type ProductVariant = {
  id: string;
  checkoutUrl: string;
  productUrl: string;   // vendor product page URL with ?variant=ID (shows the right color)
  available: boolean;
  price: number;
  currency: string;
  options: Array<{ name: string; label: string }>;
  imageUrl: string;
};

export type ShopifyProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  allImages: string[];                        // deduplicated images across product + all variants
  colorImages: Record<string, string>;        // colorName → first image for that color
  colorImageSets: Record<string, string[]>;   // colorName → ALL images for that color
  vendorName: string;
  checkoutUrl: string;
  productPageUrl: string;   // vendor product page URL with ?variant=ID — used for enrichment
  variants: ProductVariant[];
  options: Array<{ name: string; values: string[] }>;
  rating?: number;
  reviewCount?: number;
};

export async function searchShopifyProducts(
  query: string,
  limit = 10,
): Promise<ShopifyProduct[]> {
  limit = Math.min(limit, 50);
  const res = await fetch(SHOPIFY_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2026-03-26",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: {
        name: "search_catalog",
        arguments: {
          meta: {
            "ucp-agent": {
              profile: "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json",
            },
          },
          catalog: {
            query,
            filters: { available: true },
            pagination: { limit },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify catalog search failed: ${res.status} — ${text}`);
  }

  const json = await res.json() as MCPResponse;

  if (json.error) {
    throw new Error(`Shopify MCP error ${json.error.code}: ${json.error.message}`);
  }

  const products: RawProduct[] = json.result?.structuredContent?.products ?? [];

  return products.map((p) => {
    const variants: ProductVariant[] = (p.variants ?? []).map((v) => ({
      id: v.id ?? "",
      checkoutUrl: v.checkout_url ?? "",
      productUrl: v.url ?? "",
      available: v.availability?.available ?? true,
      price: v.price?.amount != null ? v.price.amount / 100 : 0,
      currency: v.price?.currency ?? "USD",
      options: (v.options ?? []).map((o) => ({ name: o.name ?? "", label: o.label ?? "" })),
      imageUrl: v.media?.[0]?.url ?? "",
    }));

    const options = (p.options ?? []).map((o) => ({
      name: o.name ?? "",
      values: (o.values ?? []).map((val) => val.label ?? ""),
    }));

    // Collect all unique images: product media first, then variant media
    const seen = new Set<string>();
    const allImages: string[] = [];
    const addImg = (url: string) => {
      if (url && !seen.has(url)) { seen.add(url); allImages.push(url); }
    };
    (p.media ?? []).forEach((m) => addImg(m.url ?? ""));
    (p.variants ?? []).forEach((v) => (v.media ?? []).forEach((m) => addImg(m.url ?? "")));

    // Map colour name → first image + full image set per colour
    const colorImages: Record<string, string> = {};
    const colorImageSets: Record<string, string[]> = {};
    for (const v of (p.variants ?? [])) {
      const colorOpt = (v.options ?? []).find(
        (o) => o.name?.toLowerCase() === "color" || o.name?.toLowerCase() === "colour",
      );
      if (colorOpt?.label) {
        const label = colorOpt.label;
        const variantImgs = (v.media ?? []).map((m) => m.url ?? "").filter(Boolean);
        // First image for the colour (keep first variant's first image)
        if (!colorImages[label]) {
          colorImages[label] = variantImgs[0] ?? "";
        }
        // All images for the colour — deduplicated across variants of same colour
        if (!colorImageSets[label]) colorImageSets[label] = [];
        for (const img of variantImgs) {
          if (!colorImageSets[label].includes(img)) colorImageSets[label].push(img);
        }
      }
    }

    const mainImage = p.media?.[0]?.url ?? "";

    return {
      id: p.id ?? "",
      title: p.title ?? "",
      description: p.description?.plain ?? p.description?.html ?? "",
      price: p.price_range?.min?.amount != null ? p.price_range.min.amount / 100 : 0,
      currency: p.price_range?.min?.currency ?? "USD",
      imageUrl: mainImage,
      allImages: allImages.length > 0 ? allImages : (mainImage ? [mainImage] : []),
      colorImages,
      colorImageSets,
      vendorName: p.variants?.[0]?.seller?.name ?? "",
      checkoutUrl: p.variants?.[0]?.checkout_url ?? "",
      productPageUrl: p.variants?.[0]?.url ?? "",
      variants,
      options,
      rating: p.rating?.value,
      reviewCount: p.rating?.count,
    };
  });
}

// MCP response shape — contained here, never exported
type RawMedia = { url?: string; alt_text?: string };

type RawVariant = {
  id?: string;
  checkout_url?: string;
  url?: string;
  availability?: { available?: boolean };
  price?: { amount?: number; currency?: string };
  options?: Array<{ name?: string; label?: string }>;
  media?: RawMedia[];
  seller?: { name?: string };
};

type RawOption = {
  name?: string;
  values?: Array<{ label?: string }>;
};

type RawProduct = {
  id?: string;
  title?: string;
  description?: { plain?: string; html?: string };
  price_range?: { min?: { amount?: number; currency?: string } };
  media?: RawMedia[];
  variants?: RawVariant[];
  options?: RawOption[];
  rating?: { value?: number; count?: number };
};

type MCPResponse = {
  jsonrpc?: string;
  id?: number;
  result?: {
    structuredContent?: { products?: RawProduct[] };
    [key: string]: unknown;
  };
  error?: { code: number; message: string };
};
