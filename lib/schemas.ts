import { z } from "zod";

// Chowdeck checkout — delivery details captured against the cart at checkout time.
export const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  whatsapp: z.string().min(7, "Please enter a valid WhatsApp number"),
  address: z.string().min(5, "Please enter a full delivery address"),
  city: z.string().min(2, "Please enter a city"),
  state: z.string().min(2, "Please select a state"),
  landmark: z.string().optional(),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

// Chowdeck payment initialization — checkout details + cart items to be
// re-priced server-side from the `products` table (never trust client amounts).
export const initializePaymentSchema = checkoutFormSchema.extend({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "Your cart is empty"),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;

// Order tracking lookup — reference + email pair so a guessed reference alone
// can't pull up someone else's order.
export const trackOrderSchema = z.object({
  reference: z.string().min(1, "Enter your order reference"),
  email: z.string().email("Enter the email you checked out with"),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
