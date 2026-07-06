# Build Plan

## Business Model (Confirmed)

Chowdeck for global brands. Customer browses → adds to cart → pays FULL price in naira on KOI → KOI buys from vendor and delivers. Customer never leaves KOI to buy anything.

## Core Principle

Full page UI built with mock data first — verified visually — then wire functionality. Mobile-first always. One feature at a time.

## Data Strategy

- Shopify Global Catalog API is the ONLY product source
- Products synced into InsForge DB via /api/sync/products
- Pages always read from DB — never live API calls on page load
- Naira conversion: USD × 1600, GBP × 2000, EUR × 1700 (config value, not hardcoded)

---

## Phase 1 — Foundation ✅ COMPLETE

- [x] 01 Project Setup + Design System
- [x] 02 Layout — Navbar + Footer
- [x] 03 InsForge Setup + Database Schema
- [x] 04 Homepage — Full UI

---

## Phase 2 — Catalog ✅ COMPLETE

- [x] 05 Shopify Catalog Sync — 56 products in InsForge DB
- [x] 06 Brands — Grid + Single Brand
- [x] 07 Categories + Product Detail (dedicated /products listing removed — browsing is by brand/category only)
- [x] 08 Product Detail — gallery, size/color, Add to Cart button, naira price

---

## Phase 3 — Cart + Checkout + Orders (CURRENT)

### 09 Cart System
**What exists:** CartDrawer, useCart hook, Add to Cart on ProductCard and PDP
**What to build:**
- Full /cart page — items list, quantities, naira subtotal, delivery estimate, proceed to checkout button
- Cart item: image, brand, name, size, color, naira price, qty stepper, remove button
- Empty cart state with "Browse Brands" CTA
- Cart persists in localStorage

### 10 Checkout Flow
**What to build:**
- /checkout page — two sections: delivery details form + order summary
- Delivery form: full name, email, WhatsApp number, street address, city, state (Nigerian states dropdown), landmark (optional)
- Order summary: itemised cart, subtotal, delivery fee, total in naira
- Zod validation on all fields
- "Place Order & Pay" button triggers Paystack

### 11 Paystack — Full Naira Checkout
**What to build:**
- POST /api/payments/initialize — creates Paystack transaction for full naira amount
- Paystack hosted checkout
- POST /api/payments/verify — server-side verification
- On success: create order + order_items in InsForge, clear cart, redirect to /order/success
- On failure: show error, keep cart intact
- Amount = sum of (product naira price × qty) + delivery fee

### 12 Order Confirmation + Tracking
**What to build:**
- /order/success — shows order reference, estimated delivery, "Track your order" link
- /track — form: enter reference + email
- /order/[reference] — status timeline: Confirmed → Sourcing → Shipped → Delivered
- Lookup verifies reference AND email match before showing

---

## Phase 4 — Admin

### 13 Admin Auth + Layout
- /admin/login — InsForge auth (staff only)
- middleware.ts protects /admin/*
- AdminSidebar — Orders, Dashboard, Logout

### 14 Admin Orders
- /admin/orders — table: reference, customer, items, total, status, date
- Filter by status, search by reference/email
- /admin/orders/[id] — full order detail: customer info, items, delivery address, naira total
- Status updater: confirmed → sourcing → shipped → delivered → cancelled
- Internal notes field (staff only, not shown to customer)
- revalidatePath after status update so tracking page updates

---

## Phase 5 — Company Pages + Polish

### 15 Company Pages
- /about, /faq, /contact, /returns, /privacy, /terms
- Use company info from brand docs

### 16 Polish Pass
- Loading and empty states everywhere
- Framer Motion scroll reveals on all sections
- Mobile QA on real device
- Accessibility: focus rings, alt text, touch targets

---

## Database Schema (Updated for Chowdeck Model)

### orders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| reference | text | KOI-XXXXXX |
| customer_name | text | |
| customer_email | text | |
| customer_phone | text | WhatsApp number |
| delivery_address | text | |
| delivery_city | text | |
| delivery_state | text | |
| delivery_landmark | text | optional |
| total_naira | numeric | full amount charged via Paystack |
| status | text | confirmed/sourcing/shipped/delivered/cancelled |
| paystack_reference | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### order_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| order_id | uuid | references orders |
| product_id | uuid | references products |
| title | text | product name at time of order |
| brand | text | |
| image_url | text | |
| size | text | selected size |
| color | text | selected color |
| price_naira | numeric | naira price at time of order |
| quantity | integer | |
| vendor_url | text | where KOI will buy the item |

### payments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| order_id | uuid | |
| paystack_ref | text | |
| amount_naira | numeric | |
| status | text | pending/success/failed |
| verified_at | timestamptz | |

---

## Invariants (Chowdeck Model)

- Paystack is ALWAYS charged the full naira amount — never just a delivery fee
- An order is ONLY created after Paystack verification succeeds server-side
- Never trust the client redirect alone — always verify with Paystack secret key
- Order status starts at "confirmed" (not "submitted") — because payment is taken at creation
- Cart is cleared only after successful order creation
- Naira conversion rates live in a single config file — never hardcoded in components
- The old OrderForm (self-report model) is removed — it is not part of this model
