# Architecture

## Stack

| Layer                          | Tool                          | Purpose                                          |
| ------------------------------ | ----------------------------- | ------------------------------------------------ |
| Framework                      | Next.js (App Router)          | Full stack framework                             |
| Auth + DB + Storage            | InsForge                      | Backend for admin auth, database, file storage   |
| Product catalog                | Affiliate Product API         | Product + brand data and vendor redirect links   |
| Payments                       | Paystack                      | Collecting the shipping fee in NGN               |
| Styling                        | Tailwind CSS v4 + shadcn/ui   | UI components and styling                        |
| Fonts                          | Satoshi (headings) + Inter (body) | Brand typography                             |
| Language                       | TypeScript (strict)           | Throughout                                       |
| Validation                     | Zod                           | Form + API payload validation                    |
| Icons                          | lucide-react                  | Iconography                                      |

> **Version note:** Pin Next.js to the latest stable release at the time of `create-next-app`, App Router only. Always check the live Next.js docs before using a Next-specific API — they change often.
>
> **Backend note:** InsForge is the chosen backend. If InsForge becomes a blocker, Supabase is a drop-in alternative with the same client/server pattern (auth, Postgres DB, storage). Keep all backend access behind `lib/insforge-*` so swapping is contained to two files.
>
> **Affiliate API note:** The exact product-feed and redirect-link mechanics depend on the approved network (Skimlinks or alternative). Treat `lib/affiliate.ts` as the only place that knows the provider's shape, and confirm the real API contract once access is approved.

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   ├── progress-tracker.md
│   └── designs/
├── app/
│   ├── layout.tsx                          → Root layout, fonts, providers
│   ├── page.tsx                            → Homepage
│   ├── brands/
│   │   ├── page.tsx                        → All brands grid
│   │   └── [slug]/page.tsx                 → Single brand products
│   ├── categories/
│   │   └── [slug]/page.tsx                 → Category browsing
│   ├── products/
│   │   ├── page.tsx                        → Product listing + search/filter/sort
│   │   └── [id]/page.tsx                   → Product detail + vendor redirect
│   ├── order/
│   │   ├── new/page.tsx                    → Submit order form
│   │   └── [reference]/page.tsx            → Order status / tracking
│   ├── track/page.tsx                      → Look up order by reference + email
│   ├── checkout/
│   │   └── [reference]/page.tsx            → Pay shipping fee (Paystack)
│   ├── about/page.tsx
│   ├── faq/page.tsx
│   ├── contact/page.tsx
│   ├── returns/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── (admin)/
│   │   ├── admin/page.tsx                  → Admin dashboard home
│   │   ├── admin/login/page.tsx            → Admin login
│   │   └── admin/orders/
│   │       ├── page.tsx                    → Orders list + status filters
│   │       └── [id]/page.tsx               → Order detail — set fee, update status
│   └── api/
│       ├── sync/products/route.ts          → Trigger affiliate catalog sync
│       ├── orders/route.ts                 → Create order (from submit form)
│       └── payments/
│           ├── initialize/route.ts         → Start Paystack transaction
│           └── verify/route.ts             → Verify Paystack transaction server-side
├── actions/
│   ├── orders.ts                           → Admin order mutations (set fee, status, notes)
│   └── contact.ts                          → Contact form submission
├── lib/
│   ├── insforge-client.ts                  → InsForge browser client
│   ├── insforge-server.ts                  → InsForge server client
│   ├── affiliate.ts                        → Affiliate product API client + mappers
│   ├── paystack.ts                         → Paystack init + verify helpers
│   ├── shipping.ts                         → Shipping fee helpers / status constants
│   └── utils.ts                            → Shared utilities
├── components/
│   ├── ui/                                 → shadcn/ui components only
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── AdminSidebar.tsx
│   ├── home/
│   │   ├── Hero.tsx
│   │   ├── FeaturedBrands.tsx
│   │   ├── FeaturedProducts.tsx
│   │   └── HowItWorks.tsx
│   ├── catalog/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── BrandCard.tsx
│   │   ├── CatalogFilters.tsx
│   │   └── CatalogSort.tsx
│   ├── product/
│   │   ├── ProductGallery.tsx
│   │   ├── ProductInfo.tsx
│   │   └── BuyOnVendorButton.tsx
│   ├── order/
│   │   ├── OrderForm.tsx
│   │   ├── OrderSummary.tsx
│   │   └── OrderStatusTimeline.tsx
│   ├── checkout/
│   │   └── PaystackButton.tsx
│   └── admin/
│       ├── OrdersTable.tsx
│       ├── OrderStatusBadge.tsx
│       ├── SetShippingFeeForm.tsx
│       └── StatusUpdater.tsx
└── types/
    └── index.ts                            → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `app/`        | Pages and API routes only. No business logic inside route handlers.                   |
| `actions/`    | Server Actions for UI-triggered mutations only (admin order updates, contact).        |
| `lib/`        | Third-party client init (InsForge, Paystack, affiliate) and shared utilities only.    |
| `components/` | UI only. No direct DB calls and no payment logic inside components.                   |
| `types/`      | TypeScript types shared across the project.                                           |

---

## Data Flow

### Catalog Sync (API Route, scheduled or manual trigger)

```
Trigger /api/sync/products
        ↓
lib/affiliate.ts fetches products + brands from affiliate API
        ↓
Map provider shape → KOI products/brands shape
        ↓
Upsert into InsForge products + brands tables
        ↓
Catalog pages read from DB (fast, no live API on page load)
```

### Browsing → Vendor Redirect

```
Customer opens product page (Server Component reads products from DB)
        ↓
Clicks "Buy on vendor site"
        ↓
Opens affiliate redirect_url in a new tab (vendor site)
```

### Order Submission (API Route)

```
Customer submits OrderForm
        ↓
POST /api/orders  (validate with Zod)
        ↓
Create order in InsForge with status 'submitted' + unique reference
        ↓
Return reference → show confirmation page
```

### Shipping Fee (Server Action, admin)

```
Staff opens /admin/orders/[id]
        ↓
SetShippingFeeForm → Server Action actions/orders.ts
        ↓
Update order: shipping_fee set, status 'awaiting_payment'
        ↓
revalidatePath → customer can now pay at /checkout/[reference]
```

### Payment (API Routes)

```
Customer clicks Pay on /checkout/[reference]
        ↓
POST /api/payments/initialize → Paystack transaction init → get authorization_url
        ↓
Redirect customer to Paystack
        ↓
Paystack redirects back with reference
        ↓
POST /api/payments/verify → verify with Paystack secret key (server-side)
        ↓
If success: record payment, set order status 'paid'
```

---

## InsForge Database Schema

### `brands`

| Column       | Type        | Notes                                  |
| ------------ | ----------- | -------------------------------------- |
| id           | uuid        |                                        |
| external_id  | text        | ID from affiliate API (unique)         |
| name         | text        |                                        |
| slug         | text        | Unique, URL-safe                       |
| logo_url     | text        |                                        |
| description  | text        |                                        |
| category     | text        | Primary category grouping              |
| is_featured  | boolean     | Show on homepage                       |
| created_at   | timestamptz |                                        |
| updated_at   | timestamptz |                                        |

### `categories`

| Column     | Type        | Notes               |
| ---------- | ----------- | ------------------- |
| id         | uuid        |                     |
| name       | text        |                     |
| slug       | text        | Unique, URL-safe    |
| created_at | timestamptz |                     |

### `products`

| Column         | Type        | Notes                                              |
| -------------- | ----------- | -------------------------------------------------- |
| id             | uuid        |                                                    |
| external_id    | text        | ID from affiliate API (unique)                     |
| title          | text        |                                                    |
| brand_id       | uuid        | References brands                                  |
| brand_name     | text        | Denormalised for fast listing                      |
| category       | text        |                                                    |
| description    | text        |                                                    |
| image_url      | text        | Primary image                                      |
| images         | text[]      | Additional images if provided                      |
| price_amount   | numeric     | Vendor price in original currency                  |
| price_currency | text        | e.g. USD, GBP                                      |
| vendor_name    | text        | e.g. Nike, Zara                                    |
| vendor_url     | text        | Affiliate redirect URL → vendor site               |
| in_stock       | boolean     |                                                    |
| is_featured    | boolean     | Show on homepage                                   |
| synced_at      | timestamptz | Last time refreshed from API                       |

### `orders`

| Column            | Type        | Notes                                                                 |
| ----------------- | ----------- | --------------------------------------------------------------------- |
| id                | uuid        |                                                                       |
| reference         | text        | Unique human-friendly reference (e.g. KOI-7F3A2B)                      |
| customer_name     | text        |                                                                       |
| customer_email    | text        |                                                                       |
| customer_phone    | text        | WhatsApp number                                                       |
| delivery_address  | text        | Full address                                                          |
| delivery_city     | text        |                                                                       |
| delivery_state    | text        |                                                                       |
| status            | text        | submitted / awaiting_payment / paid / sourcing / shipped / delivered / cancelled |
| shipping_fee      | numeric     | NGN, null until staff sets it                                         |
| payment_reference | text        | Paystack reference once paid                                          |
| payment_status    | text        | unpaid / paid                                                         |
| internal_notes    | text        | Staff-only notes                                                      |
| created_at        | timestamptz |                                                                       |
| updated_at        | timestamptz |                                                                       |

### `order_items`

| Column         | Type        | Notes                                          |
| -------------- | ----------- | ---------------------------------------------- |
| id             | uuid        |                                                |
| order_id       | uuid        | References orders                              |
| product_id     | uuid        | Optional — set if came from a KOI product page |
| title          | text        | What the customer bought                       |
| vendor_name    | text        |                                                |
| vendor_url     | text        | Link to the product they bought                |
| price_paid     | numeric     | What the customer paid the vendor              |
| price_currency | text        |                                                |
| quantity       | integer     | Default 1                                      |
| proof_url      | text        | Optional uploaded screenshot/confirmation      |

### `payments`

| Column          | Type        | Notes                            |
| --------------- | ----------- | -------------------------------- |
| id              | uuid        |                                  |
| order_id        | uuid        | References orders                |
| paystack_ref    | text        | Unique                           |
| amount          | numeric     | NGN                              |
| status          | text        | pending / success / failed       |
| channel         | text        | card / bank / etc. (from Paystack) |
| verified_at     | timestamptz |                                  |
| created_at      | timestamptz |                                  |

---

## InsForge Storage

| Bucket       | Path                                 | Contents                          |
| ------------ | ------------------------------------ | --------------------------------- |
| order-proofs | order-proofs/{reference}/proof-N.jpg | Customer order screenshots/proofs |

Access: public read not allowed. Proof uploads readable by staff (admin) only.

---

## Authentication

- Provider: InsForge Auth — **admin/staff only** at launch.
- Customers are **not** required to log in. Orders are guest orders, looked up by reference + email.
- Protected routes: everything under `/admin` except `/admin/login`.
- Middleware in `middleware.ts` checks the staff session on every `/admin` route.
- On admin login → redirect to `/admin`.

---

## InsForge Client Pattern

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — server context only
import { createServerClient } from "@insforge/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
};
```

---

## Paystack Pattern (shipping fee only — NGN)

```typescript
// Amounts are in KOBO (NGN * 100). Always verify server-side before trusting success.
const init = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: order.customer_email,
    amount: Math.round(order.shipping_fee * 100), // kobo
    reference: paystackRef,
    metadata: { order_reference: order.reference },
    callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/${order.reference}?ref=${paystackRef}`,
  }),
});
```

---

## Affiliate API Pattern (catalog sync)

```typescript
// lib/affiliate.ts — the ONLY file that knows the provider's response shape.
// Map the provider's product shape into KOI's products table shape, then upsert.
// Run on a schedule (e.g. a cron-triggered call to /api/sync/products), not on page load.
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI. Components contain no DB or payment logic.
- All InsForge server-side reads/writes use `createInsforgeServer()` — never the browser client on the server.
- A Paystack payment is only marked successful after a **server-side verify** call against Paystack — never from the client redirect alone.
- KOI never collects the product price — only the shipping fee. No checkout flow ever charges for the product itself.
- Order `status` is always one of: `submitted`, `awaiting_payment`, `paid`, `sourcing`, `shipped`, `delivered`, `cancelled` — never any other value.
- Shipping fee and order status are only changed by authenticated staff in `/admin` — never by the customer.
- All money displayed to the customer for payment is in NGN. Product prices shown in catalog keep their original currency and are clearly labelled as the vendor's price.
- The affiliate provider's response shape lives only in `lib/affiliate.ts` — no other file imports the raw API shape.
- No hardcoded hex colors or raw Tailwind color classes in components — use the tokens in ui-tokens.md.
- Every API route and Server Action has a try/catch and returns `{ success, data?, error? }`.
- Customer-facing pages never require login — order lookup is by reference + email only.
