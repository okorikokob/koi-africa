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

**Pattern notes:** Size and generic variant attributes such as Fit share the same button treatment. All required variant attributes must be selected before Add to Cart is enabled.

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

**Pattern notes:** Products without options use quick Add. Products with required variants show Select and navigate to the PDP so a specific purchasable variant is captured.

<!--
Entry template:

### ProductCard
- Path: components/catalog/ProductCard.tsx
- Container: bg-surface border border-border rounded-[16px] p-4 shadow-sm hover:shadow-md transition
- Image: aspect-[4/5] object-cover rounded-[12px]
- Title: font-sans text-sm text-text-primary line-clamp-2
- Notes: whole card links to /products/[id]
-->
