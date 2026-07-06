# Project Overview

## About the Project

KOI is a premium cross-border shopping platform — **Chowdeck for global brands**. Customers browse products from hundreds of international brands (Nike, Zara, Sephora, Gucci, Apple, and more) gathered in one place on KOI. They add items to their cart, pay the full price in naira directly on KOI via Paystack, and KOI sources the item from the vendor and delivers it to their door in Nigeria.

KOI is the merchant. The customer never leaves KOI to buy anything. KOI collects the full payment in naira, purchases the item on the vendor's site using KOI's own means, and handles all international shipping and last-mile delivery.

Products are fed into KOI automatically through the **Shopify Global Catalog API** — never added by hand.

---

## The Problem It Solves

Shopping from global brands in Nigeria is hard: foreign currency, no local delivery, unreliable agents. KOI removes all that friction. The customer browses real global products in one polished place, pays in naira on KOI, and the item shows up at their door in 7–14 days. No dollar card, no forex stress, no WhatsApp middlemen.

---

## The Confirmed Business Flow

```
1. Customer browses brands and products on KOI
2. Customer adds items to cart on KOI (size, color, quantity)
3. Customer fills in delivery details (name, address, phone)
4. Customer pays FULL price in naira via Paystack on KOI
   — price = product cost converted to naira + KOI delivery margin
5. KOI receives the order, purchases the item from the vendor
6. KOI ships internationally and delivers to the customer's door
```

**KOI takes the full payment. The customer never goes to the vendor's website.**

---

## Naira Pricing

All prices on KOI are displayed and charged in naira:
- USD × 1,600 = NGN
- GBP × 2,000 = NGN
- EUR × 1,700 = NGN

KOI adds a delivery/service margin on top of the converted price. The total the customer pays covers the product cost, currency conversion, international shipping, local delivery, and KOI's margin.

Exchange rate is stored as a config value — never hardcoded in components.

---

## Pages

```
/                       → Homepage — hero, brands, featured products, how it works
/brands                 → All brands grid
/brands/[slug]          → Products from a single brand, with in-brand search
/categories/[slug]      → Category browsing
/products/[id]          → Product detail — gallery, size/color, Add to Cart
/cart                   → Cart review — items, quantities, naira total
/checkout               → Delivery details + order summary + Paystack payment
/order/success          → Order confirmed — reference number shown
/order/[reference]      → Order status / tracking page
/track                  → Look up order by reference + email
/about                  → About KOI
/faq                    → Frequently asked questions
/contact                → Contact + WhatsApp
/returns                → Return policy
/privacy                → Privacy policy
/terms                  → Terms & conditions
/admin                  → KOI staff dashboard (protected)
/admin/orders           → All orders, filter by status
/admin/orders/[id]      → Single order — update status, add notes, manage fulfillment
```

---

## Navigation

Top navbar, clean and premium:
```
Brands     Categories     Track Order     [Search]     [Cart icon + count]
```

Footer holds About, FAQ, Contact, Returns, Privacy, Terms, WhatsApp/email. Admin uses its own sidebar.

---

## Core User Flow

### Browsing
- Homepage shows hero, featured brands, and curated products
- Customer browses by brand, category, or search
- Every product card shows image, brand, name, and price in naira

### Product Detail
- Full product page with gallery, colors, sizes, naira price
- Primary action: **"Add to Cart"** button
- Secondary: size/color selector

### Cart
- Cart drawer accessible from navbar
- Full cart page at /cart showing all items, quantities, naira totals
- Customer can update quantities or remove items

### Checkout
- Customer enters delivery details (name, email, phone, address, city, state)
- Order summary shows itemised naira breakdown
- Paystack button charges the full naira amount
- On success → order saved to InsForge, customer sees reference number

### Order Tracking
- Customer visits /track, enters reference + email
- Sees order status timeline: Confirmed → Sourcing → Shipped → Delivered

### Admin
- Staff log in to /admin
- See all orders, open any order to update fulfillment status and add notes
- No fee-setting step — KOI's pricing is calculated at checkout

---

## Data Architecture

### Products
- Populated from Shopify Global Catalog API into InsForge `products` table
- Synced via /api/sync/products — pages always read from DB, never live API
- Read-only from the customer's perspective

### Orders
- Created when Paystack payment is confirmed server-side
- Contains customer info, delivery address, cart items, total paid in naira
- Status: confirmed → sourcing → shipped → delivered → cancelled

### Payments
- Every Paystack transaction recorded in InsForge
- Order only created after server-side Paystack verification succeeds
- Never trust client redirect alone

---

## Features In Scope (Launch)

- Premium homepage
- Brand grid and single-brand product listing
- Category browsing
- Product listing with search, filter, sort
- Product detail with gallery, size/color selector, Add to Cart
- Cart system (drawer + full cart page)
- Checkout — delivery details + naira order summary + Paystack full payment
- Order confirmation with reference
- Order tracking by reference + email
- Admin auth (KOI staff only)
- Admin orders list + single order management
- Company pages
- Mobile-first responsive

## Features Out of Scope (Phase 2+)

- Customer accounts / login
- Reviews / ratings / wishlists
- Multiple currencies
- Push notifications
- Mobile app
- Loyalty program

---

## Target User

A Nigerian shopper who:
- Wants real products from global brands
- Doesn't want foreign cards or currency stress
- Will pay a fair naira price for convenience and reliability

---

## Success Criteria

- Customer can go from homepage to paid order in under 5 minutes
- Paystack payment verified server-side before order is created
- Every paid order is trackable by reference + email
- Admin can see and manage all orders
- UI matches KOI brand system on every page, mobile and desktop
