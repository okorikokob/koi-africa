import { z } from "zod";

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(500).optional(),
});

const variantSchema = z.object({
  id: z.string().trim().min(1).max(255),
  sku: z.string().trim().max(255).optional(),
  colour: z.string().trim().max(120).optional(),
  size: z.string().trim().max(120).optional(),
  currentPrice: z.number().nonnegative().nullable(),
  availability: z.enum(["in_stock", "limited", "out_of_stock"]),
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
  availability: z.enum(["in_stock", "limited", "out_of_stock"]),
}).superRefine((record, context) => {
  const hosts = new Set(record.images.map((image) => new URL(image.url).hostname));
  if ([...hosts].some((host) => !host.endsWith("nike.com") && !host.endsWith("nike.net"))) {
    context.addIssue({ code: "custom", message: "Images must use an official Nike CDN URL." });
  }
});

export type ApifyNikeProductRecord = z.infer<typeof apifyNikeProductRecordSchema>;
