# Progress Tracker

Update this file after every completed feature.

---

## Current Status

**Phase:** Phase 3 — Cart + Checkout + Orders
**Business Model:** Chowdeck — customer pays FULL price in naira on KOI
**Last completed:** Phase 2 complete — 56 products in DB, product detail page with Add to Cart
**Next:** 09 Cart page (/cart) → 10 Checkout page → 11 Paystack full payment → 12 Order tracking

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
- [ ] 09 Cart page — /cart full page with items, quantities, naira total
- [ ] 10 Checkout — delivery details form + order summary
- [ ] 11 Paystack — full naira payment, server-side verify, create order in InsForge
- [ ] 12 Order confirmation + tracking pages

### Phase 4 — Admin
- [ ] 13 Admin auth + layout
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

1. Delivery margin — how much does KOI add on top of the product naira price? (e.g. flat ₦15,000 or % based?) Confirm with boss before building checkout summary
2. Nigerian states list — confirm if all 36 states + FCT or specific ones only
3. koiafrica.com domain — connect to Vercel once boss provides domain registrar access

---

## Notes

- useCart hook and CartDrawer already exist and work
- Add to Cart wired on ProductCard and ProductDetail
- Old OrderForm (self-report model) should be removed or ignored — not part of Chowdeck model
- InsForge DB has orders, order_items, payments tables already created in Phase 1
