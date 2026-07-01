# UI Tokens

Design tokens for KOI, taken directly from the KOI Brand Guidelines, Color System, and Type Scale documents. Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

KOI uses **Tailwind CSS v4**. All tokens are defined with the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` is needed for colors or tokens.

Tailwind v4 generates utility classes automatically from `@theme` variables:

- `--color-primary` → `bg-primary`, `text-primary`, `border-primary`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — reference the CSS variable directly
style={{ color: "var(--color-text-primary)" }}

// Never — hardcoded hex
className="bg-[#004AAD] text-[#121212]"

// Never — raw Tailwind color classes
className="bg-blue-600 text-gray-800"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* ---- Fonts ---- */
  --font-display: "Satoshi", sans-serif;   /* headings, nav, buttons, emphasis */
  --font-sans: "Inter", sans-serif;        /* body, forms, tables, long-form */

  /* ---- Primary brand (KOI Blue) ---- */
  --color-primary: #004aad;          /* primary actions, links, active states, focus rings */
  --color-primary-hover: #003d8f;    /* hover + pressed */
  --color-primary-soft: #eaf2ff;     /* selected states, soft info backgrounds, hover surfaces */
  --color-primary-foreground: #ffffff;

  /* ---- Neutral system ---- */
  --color-background: #fffbf0;        /* page backgrounds, large surfaces */
  --color-surface: #ffffff;           /* cards, inputs, modals, elevated UI */
  --color-surface-secondary: #f8f8f6; /* grouped sections, sidebars, secondary containers */

  /* ---- Borders ---- */
  --color-border: #d8d8d2;            /* dividers, input borders, card outlines */

  /* ---- Text ---- */
  --color-text-primary: #121212;      /* headings, primary content */
  --color-text-secondary: #676760;    /* supporting content, metadata, labels */
  --color-text-muted: #8f8f88;        /* disabled, placeholder, inactive */

  /* ---- Semantic ---- */
  --color-success: #14ae5c;
  --color-warning: #f5a524;
  --color-error: #e5484d;
  --color-info: #0091ff;

  /* ---- Radius ---- */
  --radius-button: 12px;   /* buttons + inputs */
  --radius-card: 16px;     /* cards */
  --radius-modal: 24px;    /* modals */
  --radius-full: 9999px;   /* pills, tags */

  /* ---- Shadows (soft, premium) ---- */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 6px 20px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.12);

  /* ---- Spacing (8pt system) ---- */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* ---- Motion ---- */
  --motion-hover: 150ms;
  --motion-card: 250ms;
  --motion-modal: 300ms;
  --motion-page: 350ms;
}
```

> **Logo color note:** The brand guideline lists Primary Blue as `#004AAD`, but the supplied `KOI_Logo.svg` uses `#004CAE` for the "O". They are almost identical. The token system uses `#004AAD` as the source of truth. Recommend aligning the logo file to `#004AAD` so the mark and UI match exactly.

---

## Color Usage Guide

### Page Layout

| Element            | Token                  |
| ------------------ | ---------------------- |
| Page background    | `bg-background`        |
| Card / surface     | `bg-surface`           |
| Secondary surface  | `bg-surface-secondary` |
| Default border     | `border-border`        |

### Typography

| Element                  | Token                              |
| ------------------------ | ---------------------------------- |
| Headings, primary text   | `text-text-primary` (#121212)      |
| Supporting text, labels  | `text-text-secondary` (#676760)    |
| Placeholder, disabled    | `text-text-muted` (#8F8F88)        |

### Primary (KOI Blue)

Used for: primary buttons, links, active nav items, focus rings, selected states.

| Element                 | Token                     |
| ----------------------- | ------------------------- |
| Button background       | `bg-primary`              |
| Button hover            | `bg-primary-hover`        |
| Button text             | `text-primary-foreground` |
| Soft highlight surface  | `bg-primary-soft`         |
| Link / active text      | `text-primary`            |

### Semantic

| Meaning                          | Token           |
| -------------------------------- | --------------- |
| Success (paid, delivered)        | `text-success`  |
| Warning (awaiting payment, pending) | `text-warning` |
| Error (failed, cancelled)        | `text-error`    |
| Info (banners, notices)          | `text-info`     |

### Order Status Badges

| Status            | Background          | Text            |
| ----------------- | ------------------- | --------------- |
| submitted         | `bg-surface-secondary` | `text-text-secondary` |
| awaiting_payment  | soft warning        | `text-warning`  |
| paid              | soft success        | `text-success`  |
| sourcing          | `bg-primary-soft`   | `text-primary`  |
| shipped           | `bg-primary-soft`   | `text-primary`  |
| delivered         | soft success        | `text-success`  |
| cancelled         | soft error          | `text-error`    |

---

## Typography Scale

Headings use **Satoshi**, body uses **Inter**. Sizes are `font-size / line-height`.

### Desktop / Web

| Style          | Font   | Weight    | Size / Line | Usage                     |
| -------------- | ------ | --------- | ----------- | ------------------------- |
| Display XL     | Satoshi| 700 Bold  | 72 / 80     | Hero headlines            |
| Display Large  | Satoshi| 700 Bold  | 60 / 68     | Landing page sections     |
| H1             | Satoshi| 700 Bold  | 48 / 56     | Main page titles          |
| H2             | Satoshi| 600 SemiBold | 40 / 48  | Section titles            |
| H3             | Satoshi| 600 SemiBold | 32 / 40  | Dashboard / block headers |
| H4             | Satoshi| 600 SemiBold | 28 / 36  | Modal titles              |
| H5             | Satoshi| 600 SemiBold | 24 / 32  | Card titles               |
| H6             | Satoshi| 600 SemiBold | 20 / 28  | Smaller section headers   |
| Body Large     | Inter  | 400 Regular | 18 / 30   | Marketing descriptions    |
| Body Regular   | Inter  | 400 Regular | 16 / 28   | Default UI / body text    |
| Body Small     | Inter  | 400 Regular | 14 / 24   | Secondary content         |
| Label Large    | Inter  | 500 Medium  | 14 / 20   | Labels / buttons          |
| Caption        | Inter  | 500 Medium  | 12 / 18   | Tags, captions, metadata  |

### Mobile

| Style            | Font   | Weight    | Size / Line | Usage                  |
| ---------------- | ------ | --------- | ----------- | ---------------------- |
| Mobile H1        | Satoshi| 700 Bold  | 36 / 44     | Main mobile titles     |
| Mobile H2        | Satoshi| 600 SemiBold | 30 / 38  | Section headers        |
| Mobile H3        | Satoshi| 600 SemiBold | 24 / 32  | Card headings          |
| Mobile H4        | Satoshi| 600 SemiBold | 20 / 28  | Smaller headings       |
| Mobile Body Large| Inter  | 400 Regular | 18 / 28   | Lead paragraphs        |
| Mobile Body      | Inter  | 400 Regular | 16 / 24   | Default mobile text    |
| Mobile Small     | Inter  | 400 Regular | 14 / 22   | Secondary info         |
| Mobile Label     | Inter  | 500 Medium  | 14 / 20   | Buttons / labels       |
| Mobile Caption   | Inter  | 400 Regular | 12 / 18   | Supporting details     |

Approved font weights only: **400, 500, 600, 700**.

---

## Spacing (8pt system)

| Token      | Value | Usage                  |
| ---------- | ----- | ---------------------- |
| xs         | 4px   | Tight inline gaps      |
| sm         | 8px   | Badge / tag gaps       |
| md         | 16px  | Field gaps, card padding (compact) |
| lg         | 24px  | Card padding, gaps between sections |
| xl         | 32px  | Page section padding   |
| 2xl        | 48px  | Large section spacing  |
| 3xl        | 64px  | Hero / major spacing   |

Desktop uses a 12-column grid. Mobile prioritises touch targets and generous spacing.

---

## Radius & Elevation

| Element            | Radius          | Shadow      |
| ------------------ | --------------- | ----------- |
| Buttons / inputs   | 12px            | none / sm   |
| Cards              | 16px            | sm or md    |
| Modals             | 24px            | lg          |
| Pills / tags       | full            | none        |

Shadows stay soft and subtle to keep the premium look. Never use heavy or dark shadows.

---

## Motion

| Interaction       | Duration |
| ----------------- | -------- |
| Hover             | 150ms    |
| Card transitions  | 250ms    |
| Modal animations  | 300ms    |
| Page transitions  | 350ms    |

Use subtle fades and soft scaling. No dramatic or bouncy motion.

---

## Invariants

- Never use hex values directly in components — always use tokens.
- Headings always use Satoshi (`font-display`); body always uses Inter (`font-sans`).
- `#004AAD` is the only blue — never use Tailwind's built-in blue scale.
- Card surfaces are always white (`bg-surface`). Color lives inside cards via text, badges, and accents — never as a colored card background.
- Borders always use `--color-border` (#D8D8D2) — never `border-gray-*`.
- Only the four approved font weights (400/500/600/700) are used.
- Shadows are only `--shadow-sm`, `--shadow-md`, `--shadow-lg` — never custom heavy shadows.
