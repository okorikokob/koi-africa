# Project Overview

## About the Project

KOI is a premium cross-border shopping platform. It gathers products from many global brands (Nike, Zara, Sephora, Apple, and more) into one place so Nigerian customers can discover them easily. Think of it as a "Chowdeck for global brands" — one storefront, many vendors.

KOI does **not** sell the products or take payment for them. The customer buys the product on the vendor's own website. KOI's job is **discovery + delivery**: it shows the products beautifully, sends the customer to the vendor to purchase, and then brings the item into Nigeria and delivers it to the customer's door. The only money KOI collects is the **delivery/shipping fee**, paid in naira through Paystack.

Products are fed into KOI automatically through an **affiliate product API** (Skimlinks or the chosen affiliate network) — never added by hand. The affiliate link is also how the customer is redirected to the vendor, and how KOI can earn a small affiliate commission on the click.

---

## The Problem It Solves

Shopping from global brands in Nigeria is hard: international cards, foreign currency, no local delivery, no support. Customers either give up or rely on informal "plug" agents over WhatsApp with no structure or trust.

KOI removes that friction. The customer browses real global products in one polished place, buys on the trusted vendor site, and hands the hard part — international shipping and last-mile delivery — to KOI. They pay one local fee in naira and the item shows up at their door.

---

## The Five-Step Flow (locked with the boss)

```
1. Customer browses products from many brands on KOI.
2. Customer clicks a product and is redirected to the vendor's site to buy it there.
3. Customer returns to KOI and submits their order details + delivery address.
4. KOI reviews the order and sets the shipping fee; customer pays it via Paystack.
5. KOI coordinates international shipping and delivers the item to the customer's door.
```

> **Why a "review then pay" step (4)?** Cross-border shipping cost depends on the item's weight, size, and source country — none of which KOI knows until the customer says what they bought. So at launch, the customer submits the order first, a KOI staff member reviews it in the admin dashboard and sets the shipping fee, the customer is notified, and then pays. A flat or zone-based instant fee is a possible phase-2 simplification. **CONFIRM the exact fee model with the boss before building Phase 4.**

---

## Pages

```
/                       → Homepage — hero, featured brands, featured products, how it works
/brands                 → All brands grid
/brands/[slug]          → Products from a single brand
/categories/[slug]      → Category browsing (fashion, beauty, tech, fragrance, etc.)
/products               → All products / search + filter results
/products/[id]          → Product detail page + "Buy on vendor site" redirect button
/order/new              → Submit order form (after returning from vendor)
/order/[reference]      → Order status / tracking page
/track                  → Look up an order by reference + email
/checkout/[reference]   → Pay the shipping fee (Paystack) once KOI has set it
/about                  → About KOI
/faq                    → Frequently asked questions
/contact                → Contact + WhatsApp line
/returns                → Return policy
/privacy                → Privacy policy
/terms                  → Terms & conditions
/admin                  → KOI staff dashboard (protected)
/admin/orders           → All orders, filter by status
/admin/orders/[id]      → Single order — set shipping fee, update status, add notes
```

---

## Navigation

Top navbar, clean and premium. Public nav items:

```
Brands     Categories     Track Order     [Search]
```

Footer holds About, FAQ, Contact, Returns, Privacy, Terms, and the WhatsApp/email contact. Full-width layout, no sidebar on public pages. The admin area uses its own simple sidebar.

---

## Core User Flow

### Browsing
- Homepage shows a premium hero, featured brands, and curated featured products.
- Customer browses by brand or category, or searches.
- Every product card shows image, brand, name, and vendor price (displayed in its original currency with a clear note that KOI handles delivery, not the product price).

### Product → Vendor Redirect
- Product detail page shows the full product info pulled from the affiliate API.
- The primary action is a **"Buy on [Vendor] site"** button that opens the affiliate redirect URL in a new tab.
- A short, friendly note explains the flow: "Buy this on the brand's site, then come back to KOI and submit your order so we can deliver it to you."

### Submit Order (manual — by design)
- After buying on the vendor site, the customer comes to `/order/new`.
- They fill a short form:
  - What they bought (product name / link / paste the product, optionally pre-filled if they came from a KOI product page)
  - The price they paid and currency
  - Optional: upload a screenshot or paste their order confirmation
  - Their full name, email, phone (WhatsApp), and delivery address
- On submit, an order is created with status `submitted` and a unique order reference is shown.
- The customer is told KOI will review and send the shipping fee shortly.

### Shipping Fee + Payment
- A KOI staff member opens the order in `/admin/orders/[id]`, reviews it, and sets the shipping fee.
- Order status moves to `awaiting_payment`. The customer is notified (email/WhatsApp) with a link to `/checkout/[reference]`.
- The customer pays the fee via Paystack. On success, status moves to `paid`.

### Fulfilment
- KOI coordinates the international shipment and local delivery off-platform, updating the order status as it progresses: `sourcing` → `shipped` → `delivered`.
- The customer can check status any time at `/order/[reference]` or via `/track`.

### Admin
- Staff log in to `/admin`.
- See all orders, filter by status, open any order to set the shipping fee, update status, and leave internal notes.

---

## Data Architecture

### Products & Brands
- Populated automatically from the affiliate product API into the `products` and `brands` tables via a scheduled sync (not live per-request calls — faster and more reliable).
- Read-only from the customer's perspective. Never manually edited in the normal flow.

### Orders
- Created when a customer submits the order form.
- The single source of truth for the whole delivery lifecycle.
- Shipping fee and status are controlled only by KOI staff in the admin area.

### Payments
- Each Paystack transaction is recorded against an order via its reference.
- Status is verified server-side against Paystack before an order is marked `paid` — never trust the client.

---

## Features In Scope (Launch / Phase 1)

- Premium homepage — hero, featured brands, featured products, how-it-works, footer
- Top navbar + footer
- Brand grid and single-brand product listing
- Category browsing
- Product listing with search, filter (brand, category), and sort (price, newest)
- Product detail page with affiliate redirect button
- Affiliate product API sync into `products` / `brands`
- Manual order submission form
- Order reference + order tracking page
- Admin auth (KOI staff only)
- Admin orders list with status filters
- Admin order detail — set shipping fee, update status, internal notes
- Paystack shipping-fee checkout with server-side verification
- Company pages — About, FAQ, Contact, Returns, Privacy, Terms
- Mobile-first responsive across everything

## Features Out of Scope (Phase 2+)

- Customer accounts / login (launch uses guest orders + reference lookup)
- Instant automatic shipping-fee calculation by weight/zone
- KOI taking payment for the product itself (KOI only collects the delivery fee)
- AI product search or recommendations
- Analytics dashboards (PostHog etc.)
- Multiple currencies in checkout (NGN only at launch)
- Reviews / ratings
- Wishlists / saved items
- Push / email marketing automation
- Mobile app
- Remita as a second gateway (Paystack only at launch; Remita is documented as a later option)

---

## Target User

A Nigerian shopper who:
- Wants real products from global brands (fashion, beauty, tech, fragrance, baby, home)
- Doesn't want to deal with foreign cards, currency, or international shipping themselves
- Is comfortable buying online and following a simple, guided flow
- Will pay a clear local delivery fee in naira for the convenience

---

## Success Criteria

- A customer can browse brands and products on a fast, premium-feeling site on mobile and desktop.
- The affiliate API sync reliably fills the catalog with real products, images, and vendor links.
- Clicking a product reliably redirects to the correct vendor via the affiliate link.
- A customer can submit an order in under two minutes and get an order reference.
- KOI staff can review any order and set a shipping fee, and the customer can pay it via Paystack.
- Paystack payments are verified server-side and never marked paid from the client alone.
- Order status is always visible to the customer via their reference.
- The UI matches the KOI brand system exactly on every page.
