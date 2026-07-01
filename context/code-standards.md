# Code Standards

Implementation rules and conventions for the entire KOI project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer:

- **Think before implementing** — understand what is being built and why before writing a line.
- **Read context files first** — never assume; verify against architecture.md and project-overview.md.
- **Scope is sacred** — build only what the current feature requires. Don't add "helpful" extras.
- **Every feature must be testable** — if it can't be verified right after building, it's incomplete.
- **Clean over clever** — simple readable code a junior can follow beats clever abstractions.
- **One thing at a time** — finish one feature fully before starting the next.
- **Failures are expected** — wrap external calls (affiliate API, Paystack, DB) in try/catch and handle them.

---

## TypeScript

- Strict mode on in tsconfig.json — no exceptions.
- Never use `any` — use `unknown` and narrow.
- Avoid type assertions (`as X`) unless necessary, and comment why.
- Explicitly type all function parameters and return values.
- Use `type` for object shapes and unions; `interface` only for extendable component props.
- All async functions have proper error handling — never float an unhandled promise.
- `const` by default; `let` only when reassignment is needed.

---

## Next.js Conventions

- App Router only — no Pages Router.
- Components are Server Components by default.
- Add `"use client"` only when the component needs: useState/useReducer, useEffect, browser APIs, event listeners, or a client-only library.
- Never add `"use client"` to layout files unless truly required.
- Data fetching happens in Server Components — never fetch directly in Client Components.
- Route handlers live in `app/api/` — no business logic directly in route handlers.
- Server Actions live in `actions/` — never define them inline in components.
- Always read the live Next.js docs before using a Next-specific API; it changes often.
- Use Next.js `<Image>` for all catalog imagery.

---

## File and Folder Naming

- Folders: kebab-case — `order`, `admin`, `catalog`.
- Component files: PascalCase — `ProductCard.tsx`, `OrderForm.tsx`.
- Utility files: camelCase — `affiliate.ts`, `paystack.ts`.
- API route files: always `route.ts`.
- Server Action files: camelCase — `orders.ts`, `contact.ts`.
- One component per file — never export multiple components from one file.
- Index/barrel files only in `components/ui/`.

---

## Component Structure

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { ProductCard } from "@/components/catalog/ProductCard";

// 3. Type definitions
type Props = {
  productId: string;
  vendorUrl: string;
};

// 4. Component
export function BuyOnVendorButton({ productId, vendorUrl }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Always named exports for components — never default exports.
- Props type defined directly above the component unless shared.
- No inline styles — style via Tailwind classes using tokens from ui-tokens.md.

---

## API Route Handlers

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body with Zod
    // create order
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/orders]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch.
- Every route handler validates the request body with Zod before processing.
- Errors logged with the route path as prefix: `[api/orders]`.
- Always return `{ success: boolean, data?: T, error?: string }`.
- Never return raw data without the success wrapper.

---

## Server Actions

```typescript
// actions/orders.ts
"use server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function setShippingFee(orderId: string, fee: number) {
  try {
    const insforge = await createInsforgeServer();
    // verify staff session
    // validate fee
    // update order: shipping_fee + status 'awaiting_payment'
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders]", error);
    return { success: false, error: "Failed to set shipping fee" };
  }
}
```

- Every Server Action has a try/catch and returns `{ success, error? }`.
- Admin Server Actions verify the staff session before mutating.
- Always `revalidatePath` after mutations that affect page data.
- Never throw from a Server Action — return the error.

---

## Payments (Paystack) — Critical Rules

- Paystack amounts are in **kobo** (NGN × 100). Always convert with `Math.round(naira * 100)`.
- The `PAYSTACK_SECRET_KEY` is server-only — never expose it, never put it in a `NEXT_PUBLIC_` var.
- A transaction is only `paid` after `/api/payments/verify` confirms `status: "success"` with Paystack server-side. Never mark an order paid from the client redirect.
- Always verify the verified amount matches the order's shipping fee before marking paid.
- Record every transaction in the `payments` table with its Paystack reference.

---

## Affiliate API — Rules

- All provider-specific request/response shapes live only in `lib/affiliate.ts`.
- Catalog is synced into the DB via `/api/sync/products` — pages read from the DB, not the live API.
- Always map the provider shape into KOI's `products`/`brands` shape before saving — never store the raw provider object.
- The `vendor_url` saved must be the affiliate redirect link (so commission tracks and the customer reaches the right vendor).

---

## InsForge Usage

- Browser client (`lib/insforge-client.ts`) — Client Components only.
- Server client (`createInsforgeServer()`) — Server Components, route handlers, Server Actions.
- Never mix them.
- Always `await createInsforgeServer()` — it reads cookies async.
- Admin reads/writes always verify the staff session first.

---

## Error Handling

- No empty catch blocks — always log or handle.
- Console errors include a context prefix: `[component/function name]`.
- User-facing errors are human-readable — never expose raw errors or internals.
- API route errors return `status: 500` with a generic message.

---

## Order Status

The set of valid order statuses is fixed. Define it once and import everywhere.

```typescript
// lib/shipping.ts
export const ORDER_STATUSES = [
  "submitted",
  "awaiting_payment",
  "paid",
  "sourcing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
```

Never hardcode a status string anywhere else — import from here.

---

## Environment Variables

All env vars in `.env.local` for development. Never hardcode a key, URL, or secret.

| Variable                        | Used In                |
| ------------------------------- | ---------------------- |
| `NEXT_PUBLIC_INSFORGE_URL`      | lib/insforge-client.ts |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | lib/insforge-client.ts |
| `NEXT_PUBLIC_SITE_URL`          | payment callbacks      |
| `PAYSTACK_SECRET_KEY`           | lib/paystack.ts (server only) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | client init (if used) |
| `AFFILIATE_API_KEY`             | lib/affiliate.ts       |
| `AFFILIATE_API_BASE_URL`        | lib/affiliate.ts       |

`NEXT_PUBLIC_` exposes a variable to the browser. Never put a secret behind `NEXT_PUBLIC_`.

---

## Import Aliases

Always use the `@/` alias — never relative imports going up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { createInsforgeServer } from "@/lib/insforge-server";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code should be self-explanatory.
- Comments only for *why* — a non-obvious decision (e.g. the kobo conversion, the affiliate mapping).
- No TODO comments in committed code.

---

## Dependencies

Never install a package without a clear reason. Before installing, check:

1. Does shadcn/ui already provide this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies:

- `@insforge/ssr` — InsForge client
- `zod` — validation
- `lucide-react` — icons
- `tailwindcss` — styling
- `shadcn/ui` components — UI primitives

Paystack and the affiliate API are called over HTTP via `fetch` in their `lib/` files — no SDK needed unless a clear reason appears. Do not add other packages without updating this list first.
