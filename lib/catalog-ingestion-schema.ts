import { z } from "zod";

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(500).optional(),
});

const variantSchema = z.object({
  id: z.string().trim().min(1).max(255),
  sku: z.string().trim().max(255).optional(),
  gtin: z.string().trim().max(255).optional(),
  colour: z.string().trim().max(120).optional(),
  size: z.string().trim().max(120).optional(),
  currentPrice: z.number().nonnegative().nullable(),
  availability: z.enum(["in_stock", "limited", "out_of_stock", "unknown"]),
});

const colourwaySchema = z.object({
  styleColor: z.string().trim().min(1).max(255),
  colour: z.string().trim().min(1).max(120),
  canonicalUrl: z.string().url(),
  currentPrice: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  availability: z.enum(["in_stock", "limited", "out_of_stock", "unknown"]),
  primaryImage: z.string().url(),
  images: z.array(imageSchema).min(1).max(100),
  variants: z.array(variantSchema).min(1).max(600),
});

export const apifyNikeProductRecordSchema = z.object({
  storefront: z.literal("nike-us"),
  brand: z.literal("Nike"),
  sourceProductId: z.string().trim().min(1).max(255),
  styleCode: z.string().trim().max(255).optional(),
  sku: z.string().trim().max(255).optional(),
  canonicalUrl: z.string().url(),
  title: z.string().trim().min(1).max(1000),
  subtitle: z.string().trim().max(1000).optional(),
  description: z.string().trim().max(50000).optional(),
  category: z.string().trim().max(255).optional(),
  gender: z.string().trim().max(255).optional(),
  currentPrice: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  images: z.array(imageSchema).min(1).max(100),
  // Nike can legitimately expose hundreds of colour/size combinations (534 observed).
  // Keep a conservative finite ceiling to reject unexpectedly unbounded payloads.
  variants: z.array(variantSchema).max(600),
  colourways: z.array(colourwaySchema).max(100).optional(),
  availability: z.enum(["in_stock", "limited", "out_of_stock", "unknown"]),
  attributes: z.object({
    colorDescription: z.string().trim().max(120).optional(),
  }).passthrough().optional(),
  scrapedAt: z.string().datetime().optional(),
}).superRefine((record, context) => {
  const colourwayImages = record.colourways?.flatMap((colourway) => colourway.images) ?? [];
  const hosts = new Set([...record.images, ...colourwayImages].map((image) => new URL(image.url).hostname));
  if ([...hosts].some((host) => !host.endsWith("nike.com") && !host.endsWith("nike.net"))) {
    context.addIssue({ code: "custom", message: "Images must use an official Nike CDN URL." });
  }
  const styleColors = new Set<string>();
  const variantOwners = new Map<string, string>();
  for (const [colourwayIndex, colourway] of (record.colourways ?? []).entries()) {
    if (styleColors.has(colourway.styleColor)) {
      context.addIssue({
        code: "custom",
        path: ["colourways", colourwayIndex, "styleColor"],
        message: "Colourway styleColor identities must be unique within a product.",
      });
    }
    styleColors.add(colourway.styleColor);
    if (!colourway.images.some((image) => image.url === colourway.primaryImage)) {
      context.addIssue({
        code: "custom",
        path: ["colourways", colourwayIndex, "primaryImage"],
        message: "A colourway primary image must belong to its verified gallery.",
      });
    }
    for (const [variantIndex, variant] of colourway.variants.entries()) {
      if (variant.colour !== colourway.colour) {
        context.addIssue({
          code: "custom",
          path: ["colourways", colourwayIndex, "variants", variantIndex, "colour"],
          message: "A colourway variant must preserve the verified colourway colour.",
        });
      }
      const owner = variantOwners.get(variant.id);
      if (owner && owner !== colourway.styleColor) {
        context.addIssue({
          code: "custom",
          path: ["colourways", colourwayIndex, "variants", variantIndex, "id"],
          message: "A source variant cannot belong to multiple colourways.",
        });
      }
      variantOwners.set(variant.id, colourway.styleColor);
    }
  }
});

export type ApifyNikeProductRecord = z.infer<typeof apifyNikeProductRecordSchema>;
