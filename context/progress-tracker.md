# Progress Tracker

Update this file after every completed feature.

---

## Current Status

**Phase:** Phase 4 — Admin
**Business Model:** Chowdeck — customer pays FULL price in naira on KOI
**Last completed:** 15 Company pages — /about, /faq (accordion), /contact (working form via actions/contact.ts + InsForge emails.send — currently blocked, see Open Decisions), /returns (marked pending on logistics partner decision), /privacy + /terms (draft copy, flagged "pending legal review", not lawyer-reviewed)
**Next:** 16 Polish pass (Phase 5, final item)

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
- [x] 14 Admin orders list + single order management

### Phase 5 — Polish
- [x] 15 Company pages
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
4. Returns policy — depends on which logistics partners KOI signs with; /returns page currently says "pending" rather than stating a policy.
5. Contact form email — actions/contact.ts calls InsForge's emails.send(), which requires a paid InsForge plan (current plan returned "Custom email service is not available for free plan"). Form validates and submits correctly but the message never actually sends until either the plan is upgraded or the action is changed to store submissions in the DB instead. Left as-is per instruction.
6. Privacy Policy and Terms & Conditions pages are draft boilerplate (clearly labeled "pending legal review" on both pages) — not reviewed by a lawyer, should be confirmed/rewritten before being relied on.
7. Contact page WhatsApp number (+234 000 000 0000) and address (Maitama, Abuja) are placeholders — same placeholders already used in Footer.tsx — swap in the real ones when available.

---

## Notes

- useCart hook and CartDrawer already exist and work
- Add to Cart wired on ProductCard and ProductDetail
- Old OrderForm (self-report model) should be removed or ignored — not part of Chowdeck model
- InsForge DB has orders, order_items, payments tables already created in Phase 1
