import { z } from "zod";

const attributeSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

export const brightDataSephoraRecordSchema = z.object({
  url: z.string().url(),
  item_id: z.string().trim().min(1),
  variant_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().nullable().transform((value) => value ?? "").default(""),
  product_category: z.string().nullable().transform((value) => value ?? "").default(""),
  category_tree: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
  brand: z.string().trim().min(1),
  image_url: z.string().url(),
  price: z.string().trim().min(1),
  sale_price: z.string().trim().min(1).nullable().optional(),
  availability: z.enum(["in_stock", "out_of_stock", "pre_order"]),
  group_id: z.string().trim().min(1),
  variant_attributes: z.array(attributeSchema).default([]),
  store_name: z.literal("sephora"),
  store_country: z.literal("US"),
  star_rating: z.number().min(0).max(5).nullable().optional(),
  review_count: z.number().int().nonnegative().nullable().transform((value) => value ?? 0).default(0),
  additional_image_urls: z.array(z.string().url()).default([]),
  timestamp: z.string().datetime(),
}).passthrough();

export type BrightDataSephoraRecord = z.infer<typeof brightDataSephoraRecordSchema>;
