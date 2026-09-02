# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here.
2. If yes — match its exact classes and structure.
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here.

After building any component, add an entry below with: component name, file path, the exact key classes used, and any notes.

---

## Components

### Admin security form

File: components/admin/ChangePasswordForm.tsx
Last updated: 2026-09-01

| Property | Class |
| --- | --- |
| Background | page card `bg-surface`; inputs `bg-background` |
| Border | card `border border-border`; inputs `border-[1.5px] border-border` |
| Border radius | card `rounded-card`; inputs `rounded-[12px]`; alerts `rounded-[10px]` |
| Text — primary | labels `font-sans text-xs font-bold text-text-primary` |
| Text — secondary | guidance `font-sans text-xs text-text-muted` |
| Spacing | form `gap-5`; inputs `px-4 py-3.5`; card `p-4.5 sm:p-6.5` |
| Hover state | button `hover:-translate-y-px hover:bg-primary-hover` |
| Focus state | inputs `focus:border-primary focus:ring-4 focus:ring-primary-soft` |
| Shadow | card `shadow-sm`; button branded hover shadow |
| Accent usage | primary security icon and submit action; semantic error/success alerts |

**Pattern notes:** Sensitive admin forms use the established login-input treatment inside an admin surface card. Password values remain browser-only form inputs; status messages are semantic and never echo submitted values.

### Admin logistics reconciliation panel

File: components/admin/OrderLogisticsManager.tsx
Last updated: 2026-09-02

| Property | Class |
| --- | --- |
| Background | container `bg-surface`; package panels and inputs `bg-background` |
| Border | container and packages `border border-border`; inputs `border-[1.5px] border-border` |
| Border radius | container `rounded-card`; packages/inputs `rounded-[12px]`; notices `rounded-[10px]` |
| Text — primary | headings/labels `font-sans font-bold text-text-primary` |
| Text — secondary | operational guidance `text-text-secondary`; supporting rules `text-text-muted` |
| Spacing | container `p-4.5 sm:p-6.5`; form `gap-4`; package grid `gap-3` |
| Hover state | primary actions `hover:bg-primary-hover`; removal `hover:bg-error/10 hover:text-error` |
| Focus state | inputs `focus:border-primary focus:ring-4 focus:ring-primary-soft` |
| Shadow | container `shadow-sm` |
| Accent usage | primary for measurement/reconciliation, success for confirmed settlement, warning for blocked prerequisites |

**Pattern notes:** Multi-stage operational forms stay in one card and progressively reveal only the next legal action. Money is labelled as naira, package measurements display explicit base units, and Customs separation is repeated beside reconciliation controls.

### Product option selectors

File: components/product/ProductInfo.tsx
Last updated: 2026-08-17

| Property | Class |
| --- | --- |
| Background | `bg-surface`; selected `bg-primary` |
| Border | `border border-border`; selected `border-primary` |
| Border radius | `rounded-button`; colour thumbnails `rounded-[10px]` |
| Text — primary | `font-sans text-sm font-medium text-text-primary` |
| Text — secondary | `text-text-secondary` |
| Spacing | selector groups `gap-3`; choices `gap-2.5` |
| Hover state | `hover:border-text-secondary` |
| Shadow | selected `shadow-sm`; selected colour `shadow-md` |
| Accent usage | selected choices use `bg-primary text-primary-foreground` |

**Pattern notes:** Size and generic variant attributes such as Fit or Shade share the same button treatment. All required variant attributes must be selected before Add to Cart is enabled. A single exact variant without options may be selected automatically; multiple variants without distinguishable source options must remain disabled.

### Product source metadata

File: components/product/ProductInfo.tsx
Last updated: 2026-08-17

| Property | Class |
| --- | --- |
| Background | `bg-surface-secondary` |
| Border | none |
| Border radius | `rounded-2xl` |
| Text — primary | `font-sans text-sm font-medium text-text-primary` |
| Text — secondary | `font-sans text-sm text-text-muted` |
| Spacing | `p-4 gap-x-4 gap-y-2` |
| Hover state | none |
| Shadow | none |
| Accent usage | none |

**Pattern notes:** Source-provided facts such as colour, category, and availability use a compact definition-list panel. Missing facts are omitted rather than fabricated.

### Cart variant metadata

File: app/cart/page.tsx
Last updated: 2026-08-17

| Property | Class |
| --- | --- |
| Background | inherited page background |
| Border | item separator `border-b border-border` |
| Border radius | image `rounded-xl` |
| Text — primary | `font-sans text-sm font-bold text-text-primary` |
| Text — secondary | option summary `font-sans text-xs text-text-secondary` |
| Spacing | item `gap-x-4 gap-y-3 py-5` |
| Hover state | remove `hover:text-error` |
| Shadow | none |
| Accent usage | none |

**Pattern notes:** Selected variant options sit directly under the product title, use compact secondary text, and remain visible in cart, checkout, and staff order detail.

### Product card purchase action

File: components/catalog/ProductCard.tsx
Last updated: 2026-08-17

| Property | Class |
| --- | --- |
| Background | `bg-primary-soft`; hover `bg-primary` |
| Border | none |
| Border radius | `rounded-lg` |
| Text — primary | `text-[11px] font-extrabold text-primary` |
| Spacing | `px-2.5 py-1.5` |
| Hover state | `hover:bg-primary hover:text-white` |
| Shadow | none |
| Accent usage | primary soft-to-solid interaction |

**Pattern notes:** Products without options use quick Add. Products with required or ambiguous variants show Select and navigate to the PDP so a specific purchasable variant is captured. Unavailable products show Sold out with the same action styling at reduced opacity.

### Display currency selector

File: components/currency/CurrencySelector.tsx
Last updated: 2026-08-24

| Property | Class |
| --- | --- |
| Background | `bg-surface` |
| Border | `border-[1.5px] border-border` |
| Border radius | `rounded-button` |
| Text — primary | mobile `font-sans text-base font-semibold text-text-primary`; desktop `text-sm` |
| Text — secondary | optional label `font-sans text-sm font-medium text-text-secondary` |
| Spacing | control `px-3`; labelled group `gap-2` |
| Hover state | `hover:border-primary` |
| Focus state | `focus:border-primary focus:ring-2 focus:ring-primary-soft` |
| Shadow | none |
| Accent usage | primary border and soft primary focus ring |

**Pattern notes:** Use a native select for compact global preferences. Keep the mobile control at least 44px high with 16px text to provide a proper touch target and avoid browser input zoom. The desktop navbar uses the unlabelled form; the mobile drawer uses the visible label. Hide the control unless the feature is enabled and a complete stored exchange-rate snapshot is available.

<!--
Entry template:

### ProductCard
- Path: components/catalog/ProductCard.tsx
- Container: bg-surface border border-border rounded-[16px] p-4 shadow-sm hover:shadow-md transition
- Image: aspect-[4/5] object-cover rounded-[12px]
- Title: font-sans text-sm text-text-primary line-clamp-2
- Notes: whole card links to /products/[id]
-->
