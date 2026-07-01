# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 3 — Orders, Admin & Payment
**Last completed:** 03 InsForge backend + 05 Catalog seeded to DB — storefront now reads real data from InsForge (56 products with galleries/colors/variants)
**Next:** Phase 3 · 09 wire Order form → DB, then 11 Admin auth

---

## Progress

### Phase 1 — Foundation
- [x] 01 Project Setup + Design System — Next.js App Router, Tailwind v4, Satoshi + Inter fonts, globals.css tokens, KOI logo
- [x] 02 Layout — Navbar + Footer — Navbar (Brands, Categories, Track Order, Search), dark Footer (4-col, social icons, logo)
- [x] 03 InsForge Setup + Database Schema — tables (brands, categories, products, orders, order_items, payments) with status CHECK constraints + indexes; 8 categories seeded; private `order-proofs` bucket; `lib/insforge-client.ts` + `lib/insforge-server.ts` (using `@insforge/sdk`, not the `@insforge/ssr` sketch in architecture.md)
- [x] 04 Homepage — Full UI (mock data) — Hero (sliding carousel), FeaturedBrands (marquee), FeaturedProducts (4-col grid), TrendingBanner, CategoryBanners, FeatureSplit, HowItWorks (editorial steps)

### Phase 2 — Catalog
- [x] 05 Affiliate Catalog Sync — `products` schema extended (color_images, color_image_sets, variants, options, product_page_url, rating, review_count, tag, source); `/api/sync/products` pulls Shopify Global Catalog across 6 category buckets → upserts to DB (56 products seeded); storefront (home, /products, /products/[id], /brands/[slug]) now reads the DB via `lib/catalog-db.ts` instead of live Shopify. Fixes gallery/color on refresh by dropping the base64 `d`-param and routing on DB id. **Hybrid search**: `/api/products/search` queries the full live Shopify catalog (breadth) and persists each result to the DB on the fly (`persistAndMapProducts`) so search-result detail pages work by DB id — catalog grows organically as users search.
- [x] 06 Brands — Grid + Single Brand — /brands grid with category filter pills + monogram BrandCard; /brands/[slug] brand header + product grid, empty state, breadcrumb
- [x] 07 Categories + Product Listing — /products page with sidebar filters (category, brand, price, source), sort, load-more pagination, animated sidebar, mobile drawer, empty state
- [x] 08 Product Detail + Vendor Redirect — /products/[id] with gallery, ProductInfo, BuyOnVendorButton (affiliate link → new tab), KOI flow explainer, delivery info card, related products, breadcrumb

### Phase 3 — Orders, Admin & Payment
- [ ] 09 Order Submission — Form + Create
- [ ] 10 Order Tracking
- [ ] 11 Admin — Auth + Orders List + Order Detail
- [ ] 12 Paystack — Pay the Shipping Fee

### Phase 4 — Company Pages & Polish
- [ ] 13 Company Pages
- [ ] 14 Notifications + UX Polish

### Phase 5 — Hardening
- [ ] 15 Catalog Sync Automation
- [ ] 16 Reliability
- [ ] 17 Phase-2 Features (backlog)

---

## Open Decisions — confirm with the boss

1. ~~**Shipping fee model**~~ — **CONFIRMED**: staff-review model. Customer submits → staff set fee → customer pays. Instant calculator deferred to Phase 2.
2. **Affiliate network** — Skimlinks vs alternative; and whether it provides a full product feed or only monetised links (which would mean a separate product-data source). Affects Phase 2 Feature 05.
3. **Customer accounts** — launch assumes guest orders (lookup by reference + email). Confirm no login is required at launch.
4. **WhatsApp/notifications stack** — Chatwoot + Meta WhatsApp Cloud API planned; email notifications first, WhatsApp as follow-on. Confirm timing.
5. **Launch date** — confirm whether the target is a hard public launch or an internal "show it live" milestone, so scope can be cut to Phases 1–3 if needed.
6. **Hosting** — company doc prefers AWS/scalable cloud. Vercel is the fastest path for Next.js at launch; confirm whether AWS is required for launch or can come later.

---

## Decisions Made During Build

- **Shipping fee model** (Feature 11/12): Staff-review model confirmed. Customer submits order → KOI staff review and set the shipping fee in admin → customer is notified → customer pays via Paystack. Flat/instant fee deferred to Phase 2 once real order volume provides calibration data.
- **Order tracking** (Feature 10): Deferred until GIGL and DHL logistics APIs are integrated. Admin (Feature 11) is built first. Tracking page will show live shipment status via logistics partner APIs rather than just a static status label.
- **Backend**: InsForge is the chosen provider (account creation in progress). Supabase is the documented fallback if InsForge becomes a blocker.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._
