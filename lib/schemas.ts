import { z } from "zod";

export const orderInputSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Please enter a valid email address"),
  customer_phone: z.string().min(7, "Please enter a valid phone number"),
  delivery_address: z.string().min(5, "Please enter a full delivery address"),
  delivery_city: z.string().min(2, "Please enter a city"),
  delivery_state: z.string().min(2, "Please enter a state"),
  items: z
    .array(
      z.object({
        title: z.string().min(2, "Product name must be at least 2 characters"),
        vendor_name: z.string().min(1, "Vendor name is required"),
        vendor_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
        price_paid: z.number().nonnegative("Price must be 0 or more"),
        price_currency: z.string().min(1, "Currency is required"),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1, "At least one item is required"),
});

export type OrderInput = z.infer<typeof orderInputSchema>;
