import { z } from "zod";

const attributeSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const nestedVariantOptionSchema = z.object({
  option_id: z.string().trim().min(1),
  option_name: z.string().trim().min(1),
  option_price: z.number().nonnegative().nullable().optional(),
  in_stock: z.boolean(),
  image: z.string().url().nullable().optional(),
});

export const brightDataNikeRecordSchema = z.object({
  url: z.string().url(),
  item_id: z.string().trim().min(1),
  variant_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().default(""),
  product_category: z.string().default(""),
  category_tree: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
  brand: z.string().trim().min(1),
  image_url: z.string().url(),
  price: z.string().trim().min(1),
  sale_price: z.string().trim().min(1).nullable(),
  availability: z.enum(["in_stock", "out_of_stock", "pre_order"]),
  group_id: z.string().trim().min(1),
  variant_attributes: z.array(attributeSchema),
  variants: z.array(z.object({
    variant_type: z.string().trim().min(1),
    variant_options: z.array(nestedVariantOptionSchema),
  })).default([]),
  store_name: z.string(),
  store_country: z.string().length(2),
  star_rating: z.number().min(0).max(5).nullable().optional(),
  review_count: z.number().int().nonnegative().default(0),
  additional_image_urls: z.array(z.string().url()).default([]),
  gtin: z.string().trim().min(1),
  mpn: z.string().trim().min(1),
  timestamp: z.string().datetime(),
}).passthrough();

export type BrightDataNikeRecord = z.infer<typeof brightDataNikeRecordSchema>;
