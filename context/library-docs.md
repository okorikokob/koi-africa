# Library Docs

Project-specific usage patterns for every third-party service in KOI. This file covers how we use each one in *this* project. Read the relevant section before implementing any feature that touches these.

---

## Before Using Any Library

1. **Check AGENTS.md** at the project root — it lists installed skills and how to use them. Skills hold up-to-date API docs and patterns.
2. **Check if an MCP server is configured** for that tool — if so, use it before general knowledge.
3. **Read this file** for project-specific patterns that override general knowledge.

Order of authority:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for live APIs — they change, and training data may be outdated. This is especially true for Paystack and the affiliate network.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill or MCP server. Use it for the latest API patterns.

### Client vs Server

Two instances — never mix. (Full code in architecture.md.)

- Browser client — Client Components only.
- Server client — Server Components, route handlers, Server Actions.

### Auth (staff/admin only)

```typescript
const insforge = await createInsforgeServer();
const { data: { user }, error } = await insforge.auth.getUser();
if (!user) redirect("/admin/login");
```

### DB Queries

```typescript
// Read products for a brand
const { data, error } = await insforge
  .from("products")
  .select("*")
  .eq("brand_id", brandId)
  .eq("in_stock", true)
  .order("synced_at", { ascending: false });

// Create an order
const { data, error } = await insforge
  .from("orders")
  .insert({ reference, customer_name, customer_email, status: "submitted" })
  .select()
  .single();

// Update an order (admin)
const { error } = await insforge
  .from("orders")
  .update({ shipping_fee: fee, status: "awaiting_payment" })
  .eq("id", orderId);
```

**Rules:**
- Always handle the `error` return — never assume success.
- Use `.single()` when expecting exactly one row.
- Admin mutations always check the staff session first.

### Storage (order proofs)

```typescript
const { data, error } = await insforge.storage
  .from("order-proofs")
  .upload(`${reference}/proof-1.jpg`, fileBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
```

**Rules:**
- Proof uploads are not publicly readable — staff access only.
- Always save any needed URL/path back to the order/item record after upload.

---

## Affiliate Product API (Skimlinks or chosen network)

**Check first:** Confirm the real API contract once access is approved — the shapes below are placeholders to be replaced with the provider's actual response. Keep all provider knowledge inside `lib/affiliate.ts`.

### What we need from the provider
1. A **product feed / search** that returns products with: id, title, brand, category, description, image(s), price, currency, in-stock, and a **monetised vendor link**.
2. A **link/redirect** mechanism that sends the customer to the vendor and tracks KOI's commission.

> Note: Some affiliate networks (including Skimlinks) focus on link monetisation more than rich product feeds. If the chosen network does not provide a full product feed, the catalog source may need to be a separate product-data API while the affiliate network supplies the monetised links. Resolve this in `lib/affiliate.ts` once the network is confirmed, and document the decision in progress-tracker.md.

### Sync pattern

```typescript
// lib/affiliate.ts
// 1. Fetch products from the provider (paged).
// 2. Map each provider product → KOI product shape.
// 3. Upsert into products (and brands) by external_id.
// Triggered by /api/sync/products on a schedule — never on page load.

type KoiProduct = {
  external_id: string;
  title: string;
  brand_name: string;
  category: string;
  description: string;
  image_url: string;
  price_amount: number;
  price_currency: string;
  vendor_name: string;
  vendor_url: string;   // the affiliate redirect link
  in_stock: boolean;
};
```

**Rules:**
- Never store the raw provider object — always map to `KoiProduct` first.
- `vendor_url` is always the affiliate redirect link.
- Pages read products from the InsForge `products` table, never live from the affiliate API.
- Handle paging and rate limits inside `lib/affiliate.ts`.

---

## Paystack (shipping fee — NGN only)

**Check first:** Check AGENTS.md / Paystack docs for the latest endpoints. Paystack is Nigerian-focused and well-suited to NGN card/bank/transfer payments.

### Initialize a transaction (server-side)

```typescript
// lib/paystack.ts
export async function initializePayment(params: {
  email: string;
  amountNaira: number;
  reference: string;
  orderReference: string;
}) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // kobo
      reference: params.reference,
      metadata: { order_reference: params.orderReference },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/${params.orderReference}?ref=${params.reference}`,
    }),
  });
  if (!res.ok) throw new Error(`Paystack init error: ${res.status}`);
  const json = await res.json();
  return json.data.authorization_url as string;
}
```

### Verify a transaction (server-side — the source of truth)

```typescript
export async function verifyPayment(reference: string) {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}` } },
  );
  if (!res.ok) throw new Error(`Paystack verify error: ${res.status}`);
  const json = await res.json();
  return {
    success: json.data.status === "success",
    amountNaira: json.data.amount / 100,
    channel: json.data.channel as string,
  };
}
```

**Rules:**
- Amounts always in kobo when sending; divide by 100 when reading.
- `PAYSTACK_SECRET_KEY` is server-only — never `NEXT_PUBLIC_`.
- An order is marked `paid` only after `verifyPayment` returns success **and** the verified amount matches the order's shipping fee.
- Always record the transaction in the `payments` table.
- Use a unique reference per attempt (e.g. `KOI-{orderReference}-{timestamp}`).

---

## Zod

Used to validate every API payload and form submission.

```typescript
import { z } from "zod";

export const orderInputSchema = z.object({
  customer_name: z.string().min(2),
  customer_email: z.string().email(),
  customer_phone: z.string().min(7),
  delivery_address: z.string().min(5),
  delivery_city: z.string().min(2),
  delivery_state: z.string().min(2),
  items: z
    .array(
      z.object({
        title: z.string().min(2),
        vendor_name: z.string().min(1),
        vendor_url: z.string().url().optional(),
        price_paid: z.number().nonnegative(),
        price_currency: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1),
});
```

**Rules:**
- Validate on the server in the route handler, even if the client also validates.
- Never trust client input for amounts, status, or fees.

---

## shadcn/ui

**Check first:** Check AGENTS.md for an installed shadcn skill.

- Use shadcn/ui primitives (button, input, dialog, dropdown, badge, table) styled with KOI tokens.
- Override default colors to KOI tokens — never ship shadcn defaults that use generic grays/blues.
- Add only the components actually needed; don't bulk-install.
