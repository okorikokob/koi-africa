# Build Plan

## Core Principle

## Data Strategy — Mock First, API Later

Product data and the build are decoupled. The catalog is built and demoable from day one using a seeded mock dataset; the real affiliate feed plugs in later as a swappable source.

- Seed the `products` table with ~30–50 mock products using the REAL brands from KOI's list (Nike, Zara, Sephora, etc. as text) so the catalog looks legitimate and full.
- Each mock product includes a placeholder image from a free source (e.g. Unsplash or a placeholder service) — never copy official brand photos. Real, licensed images arrive later via the affiliate API.
- Mock products carry a dummy `affiliate_url` (e.g. the brand's site) so the redirect button works in the flow during the build.
- The storefront reads only from the `products` table, so when the real feed is connected, nothing in the UI changes — only the data source.
- When a real affiliate network is approved, the sync job (feature 03) replaces mock rows with live products and real images. Mock data is for development and demo only — never ship mock products to a real public launch.

Build full-page UI with mock data first — verify it visually — then wire functionality step by step. Every feature must be visible and testable before moving on. No invisible backend-only phases. Mobile-first: get the mobile layout right, then enhance for desktop.

> **Launch reality (read first):** A polished, credible launch is achievable, but the *full* platform is more than a one-week build for one developer. Phases 1–3 below are the true launch (browse + redirect + submit order + admin + pay the fee). Phases 4–5 harden and complete it. If the deadline is tight, ship through Phase 3 first, then continue. Confirm the shipping-fee model (review-then-quote vs instant) with the boss before Phase 3 Feature 11.

---

## Phase 1 — Foundation

### 01 Project Setup + Design System
Set up the project shell and lock the brand system before any feature UI.

**Logic:**
- `create-next-app` (App Router, TypeScript strict, Tailwind v4).
- Add Inter via `next/font/google`; add Satoshi via `next/font/local` (download from Fontshare into `app/fonts/`).
- Put the full `@theme` token block from ui-tokens.md into `app/globals.css`.
- Install shadcn/ui; override its theme to KOI tokens.
- Add `lib/utils.ts` and `lib/shipping.ts` (ORDER_STATUSES).
- Add the KOI logo asset.

### 02 Layout — Navbar + Footer
**UI:**
- Navbar: logo, Brands, Categories, Track Order, search affordance; mobile hamburger.
- Footer: About, FAQ, Contact, Returns, Privacy, Terms, WhatsApp + email.
- Root layout wires fonts and global layout.

### 03 InsForge Setup + Database Schema
**Logic:**
- `lib/insforge-client.ts` and `lib/insforge-server.ts`.
- Create tables from architecture.md: `brands`, `categories`, `products`, `orders`, `order_items`, `payments`.
- Create `order-proofs` storage bucket (staff-read only).
- Seed a few categories.

### 04 Homepage — Full UI (mock data)
**UI:**
- Hero with tagline ("Your gateway to global shopping.") and a primary CTA to browse.
- Featured brands strip.
- Featured products grid.
- How It Works — the 5 steps in simple language.
- Footer.
**Logic:** none yet — mock data. Verify the premium look on mobile + desktop.

---

## Phase 2 — Catalog

### 05 Affiliate Catalog Sync
**Logic:**
- `lib/affiliate.ts` — fetch + map provider products/brands → KOI shape.
- `/api/sync/products` — upsert into `products` and `brands` by `external_id`.
- Run once to populate the catalog; confirm real products + images + vendor links land in the DB.
- (If the network has no product feed, resolve the catalog source here and note it in progress-tracker.)

### 06 Brands — Grid + Single Brand (real data)
**UI:** `/brands` grid of brand cards; `/brands/[slug]` brand header + its product grid.
**Logic:** read brands and products from the DB, scoped by brand.

### 07 Categories + Product Listing (real data)
**UI:** `/categories/[slug]` and `/products` with `ProductGrid`, `CatalogFilters` (brand, category), `CatalogSort` (price, newest), and search.
**Logic:** DB queries with filter, sort, search, and pagination.

### 08 Product Detail + Vendor Redirect (real data)
**UI:** `/products/[id]` — gallery, title, brand, price (original currency + "+ KOI delivery" label), description, and the primary **Buy on [Vendor] site** button. A short note explaining the come-back-and-submit flow.
**Logic:** `BuyOnVendorButton` opens the affiliate `vendor_url` in a new tab. Wire the homepage featured sections to real DB data now too.

---

## Phase 3 — Orders, Admin & Payment (the core of launch)

### 09 Order Submission — Form + Create (real data)
**UI:** `/order/new` — `OrderForm`: what they bought (pre-filled if arriving from a product page), price paid + currency, optional proof upload, name, email, phone, delivery address/city/state. Confirmation screen showing the order reference.
**Logic:**
- `POST /api/orders` validates with Zod, generates a unique reference (e.g. `KOI-XXXXXX`), creates `orders` + `order_items`, uploads any proof to storage.
- Status starts at `submitted`.

### 10 Order Tracking (real data)
**UI:** `/order/[reference]` status page with `OrderStatusTimeline`; `/track` to look up by reference + email.
**Logic:** read the order by reference, verifying the email matches before showing details.

### 11 Admin — Auth + Orders List + Order Detail
**UI:**
- `/admin/login` (InsForge auth), `/admin` dashboard summary, `/admin/orders` table with status filters, `/admin/orders/[id]` detail.
- `SetShippingFeeForm`, `StatusUpdater`, internal notes, view proof.
**Logic:**
- Middleware protects `/admin`.
- Server Actions in `actions/orders.ts`: set shipping fee (→ `awaiting_payment`), update status, save notes. Each verifies the staff session.
- **Confirm the fee model with the boss here** — this build assumes staff set the fee after reviewing.

### 12 Paystack — Pay the Shipping Fee
**UI:** `/checkout/[reference]` shows the order + the shipping fee in NGN and a Pay button; success and failure states.
**Logic:**
- `POST /api/payments/initialize` → Paystack init → redirect to `authorization_url`.
- On return, `POST /api/payments/verify` verifies server-side; if success **and** amount matches the fee, record in `payments` and set order `paid`.
- Never mark paid from the client.

---

## Phase 4 — Company Pages & Polish

### 13 Company Pages
About, FAQ, Contact (with WhatsApp + email and a contact form via `actions/contact.ts`), Returns, Privacy, Terms — using the starter copy from the company info doc, reformatted to the brand voice.

### 14 Notifications + UX Polish
- Email/WhatsApp notification to the customer when the fee is set and when status changes (start with email; WhatsApp via the chosen stack — Chatwoot + Meta WhatsApp Cloud API — as a follow-on).
- Loading, empty, and error states everywhere.
- Accessibility pass (alt text, focus states, keyboard nav).
- Responsive QA on real devices.
- SEO basics: titles, meta, Open Graph, sitemap, favicon (use the KOI icon mark).

---

## Phase 5 — Hardening (post-launch)

### 15 Catalog Sync Automation
Schedule `/api/sync/products` (cron) and add a manual "Sync now" trigger in admin. Handle removed/out-of-stock products.

### 16 Reliability
Webhook from Paystack as a backup to the redirect verify; idempotent payment handling; basic rate limiting on public POST routes.

### 17 Phase-2 Features (backlog)
Customer accounts, instant zone-based fee calculator, reviews, wishlists, analytics, multi-currency display. None of these block launch.

---

## Feature Count

| Phase                         | Features |
| ----------------------------- | -------- |
| Phase 1 — Foundation          | 4        |
| Phase 2 — Catalog             | 4        |
| Phase 3 — Orders/Admin/Payment| 4        |
| Phase 4 — Pages & Polish      | 2        |
| Phase 5 — Hardening           | 3        |
| **Total**                     | **17**   |

**Minimum launchable product = Phases 1–3 + Feature 13 (company pages).**
