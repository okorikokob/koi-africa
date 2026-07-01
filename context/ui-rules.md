# UI Rules

Concise rules for building KOI's UI so it stays consistent and on-brand. The brand guideline PDFs and `ui-tokens.md` are the source of truth for visual decisions. The brand personality is: modern, elegant, premium, minimal, trustworthy. References: Apple, Farfetch, Stripe, Zara. Keep everything calm, polished, and uncluttered.

---

## Fonts

Two typefaces: **Satoshi** for headings/nav/buttons, **Inter** for body.

**Inter** is on Google Fonts — load via `next/font/google`:

```typescript
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

**Satoshi is NOT on Google Fonts.** It is free from Fontshare (fontshare.com). Download the Satoshi weights (400/500/600/700), place the font files in `app/fonts/`, and load via `next/font/local`:

```typescript
import localFont from "next/font/local";
const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700" },
  ],
  variable: "--font-display",
});
```

Apply both variable classes to the `<html>` tag in the root layout. The `--font-display` and `--font-sans` variables are already declared in `@theme` in globals.css. Never fall back to system fonts as the primary face.

---

## Layout

- Page max-width: 1280px for content sections, centered. Hero and full-bleed media may go edge to edge.
- Main content horizontal padding: 16px on mobile, 24–32px on desktop.
- Gap between major page sections: 48–64px on desktop, 32px on mobile.
- Navbar height: 64px, full width, `bg-surface` or `bg-background`, subtle bottom border.
- Public pages: top navbar + footer, no sidebar.
- Admin pages: simple left sidebar (`AdminSidebar.tsx`) + content area.
- Mobile-first always. Build the mobile layout first, then enhance for desktop.

---

## Navbar (public)

Items: **Brands, Categories, Track Order**, plus a search affordance and the KOI logo on the left.

- Logo on the far left (use `KOI_Logo.svg`, dark version on light backgrounds).
- Nav links: Satoshi or Inter Medium, 14–16px, `text-text-primary`; active link `text-primary`.
- No underlines — active state is a color change only.
- On mobile, collapse nav into a clean hamburger menu.
- Navbar stays simple and uncluttered — no dropdrown clutter.

---

## Cards

Every product, brand, and content block lives in a card.

```
background: bg-surface (#FFFFFF)
border: 1px solid var(--color-border)
border-radius: 16px
padding: 16–24px
box-shadow: var(--shadow-sm)   (lift to --shadow-md on hover for interactive cards)
```

Never use colored card backgrounds. Color goes inside the card via text, badges, and the primary accent — never on the card surface.

---

## Product Cards

- Image on top, fixed aspect ratio (e.g. 4:5), `object-cover`, rounded to match the card.
- Below image: brand name (caption, `text-text-secondary`), product title (Body Small/Regular, `text-text-primary`, max 2 lines), price.
- Price shows the vendor's price in its original currency with a small label like "+ KOI delivery" so customers understand KOI adds a delivery fee, not the product price.
- Whole card is clickable → product detail page.
- Hover: subtle lift (shadow sm → md) over 250ms. No dramatic scaling.

---

## Buttons

**Primary**

```
background: bg-primary (#004AAD)
hover: bg-primary-hover (#003D8F)
text: text-primary-foreground (#FFFFFF)
border-radius: 12px
padding: 12px 20px
font: Satoshi Medium, 14–16px
```

**Secondary**

```
background: bg-surface
border: 1px solid var(--color-border)
text: text-text-primary
border-radius: 12px
padding: 12px 20px
```

**Ghost / text**

```
background: transparent
text: text-primary
hover: bg-primary-soft
```

The "Buy on vendor site" button is a primary button and always opens in a new tab.

---

## Form Inputs

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: 12px
padding: 12px 14px
font: Inter, 16px (16px min on mobile to avoid zoom)
text: text-text-primary
placeholder: text-text-muted
focus: ring-1 ring-primary border-primary
```

Labels: Inter Medium, 14px, `text-text-secondary`, above the input. Validation errors: `text-error`, 12–14px, below the input.

---

## Badges & Tags

- Pills: `border-radius: full`, padding `2px 10px`, 12px Inter Medium.
- Order status badges use the status colors in ui-tokens.md.
- Category/brand tags use `bg-primary-soft` + `text-primary` or neutral `bg-surface-secondary` + `text-text-secondary`.

---

## Tables (admin orders)

- White rows separated by `1px solid var(--color-border)`. No alternating row colors.
- Column headers: uppercase, 12px, Inter Medium, `text-text-secondary`.
- Row text: 14px, `text-text-primary`.
- Row hover: `bg-surface-secondary`.
- Status shown as a badge, not raw text.

---

## Empty States

Every section that can be empty has a calm empty state:

- Short descriptive text in `text-text-muted`.
- Optional simple icon above.
- A CTA button if there's a logical next action (e.g. "Browse brands").

---

## Imagery

- Product imagery comes from the affiliate API — always `object-cover` with a consistent aspect ratio so the grid stays clean.
- Always set `alt` text (product title) for accessibility.
- Use Next.js `<Image>` with proper sizing; never raw `<img>` for catalog images.
- Provide a neutral placeholder for missing images, never a broken image.

---

## Motion & Animation

KOI uses motion to feel premium — but *calm* premium, never flashy. The goal is that the site feels expensive and smooth, the way Apple and Farfetch do, through restraint. If an animation calls attention to itself, it's wrong.

### Tools

- **Framer Motion (Motion) is the default** for all everyday UI animation — fades, reveals, hover lifts, stagger, page transitions, modals. It is declarative, React-native, and easy to apply consistently. Use it everywhere unless a moment specifically needs GSAP.
- **GSAP is reserved for a small number of showpiece hero moments only** — e.g. a scroll-driven homepage hero reveal or a pinned/parallax brand moment. Use GSAP with `ScrollTrigger` for these. Do not use GSAP for ordinary fades, hovers, or list reveals — that's Framer Motion's job.
- Never mix both tools to animate the same element. Pick one per element.

### Motion timings (from the brand guidelines — non-negotiable)

| Interaction        | Duration | Easing                         |
| ------------------ | -------- | ------------------------------ |
| Hover interactions | 150ms    | easeOut                        |
| Card transitions   | 250ms    | easeOut                        |
| Modal animations   | 300ms    | easeInOut                      |
| Page transitions   | 350ms    | easeInOut                      |
| Scroll reveals     | 400–500ms| easeOut, small upward movement |

Movement is small. Fades and gentle 8–16px upward slides and 1.02 scale — never large jumps, bounces, or springs with overshoot.

### Standard patterns

**Scroll reveal (sections, product grids):** elements start at `opacity: 0, y: 16` and animate to `opacity: 1, y: 0` when they enter the viewport. Use Framer Motion's `whileInView` with `viewport={{ once: true }}` so it only plays once.

```tsx
"use client";
import { motion } from "framer-motion";

export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

**Staggered grids (products, brands):** children reveal in sequence with a small delay (≈0.05s stagger) using a parent `variants` container with `staggerChildren`. Keeps grids feeling alive without being busy.

**Hover (product cards, buttons):** subtle only — card lifts from `shadow-sm` to `shadow-md` and/or image scales to 1.02 over 250ms. Buttons may shift background to the hover token. No scaling above 1.03, no rotation.

**Page transitions:** a soft cross-fade (opacity, optionally 8px slide) over 350ms between routes via a Framer Motion wrapper in the layout / `AnimatePresence`.

**Modals & drawers:** backdrop fades in (300ms); panel fades + scales from 0.98 → 1 or slides up 12px. Reverse on close.

**Skeletons / loading:** gentle shimmer or fade — never a spinning, attention-grabbing loader on the storefront.

### Accessibility — required

- Always respect `prefers-reduced-motion`. When the user has reduced motion enabled, disable reveals/transitions and just show content (Framer Motion's `useReducedMotion` hook, or a CSS guard for GSAP). Motion is an enhancement, never a requirement to use the site.
- Never animate in a way that delays the customer reaching the buy button, the order form, or the pay button. Content must be usable immediately even if animation hasn't finished.

### Where motion goes (and doesn't)

- **Yes:** homepage hero, section reveals on scroll, product/brand grid stagger, card hovers, page transitions, modal/drawer open-close, success confirmations.
- **No / minimal:** the order form, the payment screen, and the admin area. These are functional, trust-critical surfaces — keep motion to instant, tiny feedback only. Never animate the delivery-fee number or payment state in a flashy way.

---

## Tailwind v4 Note

KOI uses Tailwind v4. Tokens are defined with `@theme` in globals.css — no `tailwind.config.ts`. Never define colors in a config file. Always add new tokens to `@theme`.

---

## Do Nots

- Never use Tailwind's built-in color classes (`bg-blue-600`, `text-gray-500`) — use KOI tokens only.
- Never use a blue other than `#004AAD` for primary.
- Never put gradients or color on card backgrounds — cards stay white.
- Never use more than one font weight in a single UI element.
- Never show raw error messages to users — always human-readable text.
- Never use dramatic/bouncy animation — keep motion subtle and within the documented timings.
- Never use GSAP for ordinary UI animation — GSAP is only for showpiece hero moments; Framer Motion is the default.
- Never ignore `prefers-reduced-motion`.
- Never let animation block or delay access to the buy button, order form, or payment.
- Never imply KOI is charging for the product itself — always frame KOI's fee as delivery.
- Never use `<img>` for product images — use Next.js `<Image>`.