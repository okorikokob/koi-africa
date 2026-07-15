# Progress Tracker

Update this file after every completed feature.

---

## Current Status

**Phase:** Phase 4 — Admin
**Business Model:** Chowdeck — customer pays FULL price in naira on KOI
**Last completed:** 13 Admin auth + layout — /admin/login (InsForge session auth via proxy.ts), protected admin dashboard shell, sidebar, logout; login page matches context/designs/admin-login.html (premium split-screen with real KOI logo)
**Next:** 14 Admin orders list + single order management — dashboard/sidebar visuals to follow context/designs/admin.html (dark navy sidebar, KPI cards, orders table)

---

## Progress

### Phase 1 — Foundation
- [x] 01 Project Setup + Design System
- [x] 02 Layout — Navbar + Footer
- [x] 03 InsForge Setup + Database Schema
- [x] 04 Homepage — Full UI

### Phase 2 — Catalog
- [x] 05 Shopify Catalog Sync — 56 products in InsForge DB via Shopify Global Catalog API
- [x] 06 Brands — Grid + Single Brand pages
- [x] 07 Brand Detail search/filter — dedicated /products listing page removed from nav/build order; browsing is brand + category only (product detail at /products/[id] stays, in-brand search added on /brands/[slug])
- [x] 08 Product Detail — gallery, size/color selector, Add to Cart, naira prices, sticky mobile bar

### Phase 3 — Cart + Checkout + Orders
- [x] 09 Cart page — /cart full page with items, quantities, naira total
- [x] 10 Checkout — delivery details form + order summary
- [x] 11 Paystack — full naira payment, server-side verify, create order in InsForge (confirmed working in production)
- [x] 12a Order confirmation — /checkout/success verifies payment and shows order summary
- [x] 12b Order tracking page — /track + POST /api/orders/track, looks up order by reference + email
- [x] 12c Cleanup — removed dead code from the old self-report/pay-later-delivery-fee model (app/order/new, app/api/orders/route.ts, components/order/OrderForm.tsx)

### Phase 4 — Admin
- [x] 13 Admin auth + layout — InsForge staff auth, proxy.ts route protection, /admin/login (matches design mockup), AdminSidebar, logout
- [ ] 14 Admin orders list + single order management

### Phase 5 — Polish
- [ ] 15 Company pages
- [ ] 16 Polish pass

---

## Confirmed Decisions

- **Business model:** Chowdeck — customer pays KOI full price in naira, KOI buys from vendor
- **Product source:** Shopify Global Catalog API only — synced to InsForge DB
- **Naira conversion:** USD × 1600, GBP × 2000, EUR × 1700 — stored in config not hardcoded
- **Payment:** Paystack charges FULL amount (product + delivery margin) — not just delivery fee
- **Order creation:** Only after Paystack server-side verification succeeds
- **No self-report form:** The old OrderForm (redirect model) is removed
- **Cart persistence:** localStorage
- **Admin:** Staff only, no customer accounts at launch

## Open Decisions

1. Delivery margin — currently a placeholder (flat ₦10,000 + 5% of subtotal, see lib/pricing-config.ts). Confirm real number with boss.
2. ~~Nigerian states list~~ — resolved: all 36 states + FCT implemented in lib/nigeria-states.ts.
3. Domain — boss has purchased koiafrica.com; connect to Vercel (not blocking, can do anytime).

---

## Notes

- useCart hook and CartDrawer already exist and work
- Add to Cart wired on ProductCard and ProductDetail
- Old OrderForm (self-report model) should be removed or ignored — not part of Chowdeck model
- InsForge DB has orders, order_items, payments tables already created in Phase 1
