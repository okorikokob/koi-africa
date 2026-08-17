import { z } from "zod";

export const brightDataHmRecordSchema = z.object({
  category_tree: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
  color: z.string().trim().min(1).nullable().optional(),
  country_code: z.literal("US"),
  currency: z.literal("USD"),
  description: z.string().default(""),
  domain: z.string().trim().min(1),
  final_price: z.string().trim().min(1),
  image_urls: z.array(z.string().url()).default([]),
  in_stock: z.boolean(),
  initial_price: z.string().trim().min(1).nullable().optional(),
  main_image: z.string().url(),
  product_name: z.string().trim().min(1),
  url: z.string().url(),
  product_code: z.string().trim().min(1),
  brand: z.literal("H&M"),
  category: z.string().trim().min(1),
  timestamp: z.string().datetime(),
}).passthrough();

export type BrightDataHmRecord = z.infer<typeof brightDataHmRecordSchema>;
