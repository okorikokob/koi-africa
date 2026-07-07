"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Star, ChevronDown, Ruler, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatNaira, toNaira } from "@/lib/currency";
import type { Product } from "@/types";
import type { ProductVariant } from "@/lib/shopify-catalog";

type Props = {
  product: Product;
  onColorChange?: (colorName: string, images: string[]) => void;
};

const TRUST_FEATURES = [
  "100% authentic — sourced from the official brand",
  "Pay in naira via Paystack, no dollar card needed",
  "Delivered to your door in 7–14 days",
  "Price includes product, shipping & KOI delivery",
];

// Best-effort colour name → hex for fallback circles
const COLOR_HEX: Record<string, string> = {
  black: "#121212", white: "#f5f5f5", red: "#e5484d", blue: "#004aad",
  navy: "#001f5b", green: "#14ae5c", yellow: "#f5a524", pink: "#f472b6",
  purple: "#9333ea", orange: "#f97316", grey: "#8f8f88", gray: "#8f8f88",
  brown: "#7c5c3e", beige: "#e8dcc8", cream: "#fffbf0", tan: "#c9a87c",
  silver: "#b8b8b8", gold: "#d4a017", "thunder brown": "#7c5c3e",
  "oxford blue": "#001f5b", "dark olivine": "#4a5c3e", cortado: "#a07850",
};

function colorFallbackHex(label: string): string | null {
  const key = label.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_HEX)) {
    if (key.includes(name)) return hex;
  }
  return null;
}

function StarRow({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-4 w-4 ${
              n <= Math.round(rating) ? "fill-warning text-warning" : "fill-border text-border"
            }`}
          />
        ))}
      </div>
      <span className="font-sans text-sm text-text-primary">
        {rating.toFixed(1)}
        {count ? ` (${count.toLocaleString()} reviews)` : ""}
      </span>
    </div>
  );
}

function AccordionSection({
  title,
  children,
  defaultOpen = false,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-display text-sm font-semibold text-text-primary">{title}</span>
        <div className="flex items-center gap-2">
          {headerRight}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

export function ProductInfo({ product, onColorChange }: Props) {
  const { addItem } = useCart();
  const variants: ProductVariant[] = product.variants ?? [];
  const options = product.options ?? [];
  const colorImages = product.colorImages ?? {};
  const colorImageSets = product.colorImageSets ?? {};

  const colorOption = options.find(
    (o) => o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour",
  );
  const sizeOption = options.find((o) => o.name.toLowerCase() === "size");
  const hasVariants = variants.length > 0 && (colorOption || sizeOption);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colorOption?.values[0] ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  function handleColorSelect(value: string) {
    setSelectedColor(value);
    setSelectedSize(null);
    if (onColorChange) {
      // Pass the full image set for this color so the gallery can swap completely
      const imgs = colorImageSets[value]?.filter(Boolean) ?? [];
      // Fallback to single image if no set available
      const fallbackImg = colorImages[value];
      const gallery = imgs.length > 0 ? imgs : (fallbackImg ? [fallbackImg] : []);
      onColorChange(value, gallery);
    }
  }

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!hasVariants) return null;
    return (
      variants.find((v) => {
        const colorMatch =
          !colorOption ||
          v.options.some(
            (o) =>
              (o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour") &&
              o.label === selectedColor,
          );
        const sizeMatch =
          !sizeOption ||
          !selectedSize ||
          v.options.some((o) => o.name.toLowerCase() === "size" && o.label === selectedSize);
        return colorMatch && sizeMatch && v.available;
      }) ??
      variants.find(
        (v) =>
          !colorOption ||
          v.options.some(
            (o) =>
              (o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour") &&
              o.label === selectedColor,
          ),
      ) ??
      null
    );
  }, [variants, colorOption, sizeOption, selectedColor, selectedSize, hasVariants]);

  const availableSizesForColor = useMemo(() => {
    if (!colorOption || !sizeOption) return new Set<string>();
    return new Set(
      variants
        .filter(
          (v) =>
            v.available &&
            v.options.some(
              (o) =>
                (o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour") &&
                o.label === selectedColor,
            ),
        )
        .map((v) => v.options.find((o) => o.name.toLowerCase() === "size")?.label ?? "")
        .filter(Boolean),
    );
  }, [variants, colorOption, sizeOption, selectedColor]);

  const displayPrice = selectedVariant?.price ?? product.priceAmount;
  const displayCurrency = selectedVariant?.currency ?? product.priceCurrency;
  const needsSize = !!sizeOption && !selectedSize;
  const priceNaira = toNaira(displayPrice, displayCurrency);

  function handleAddToCart() {
    addItem(
      {
        id: product.id,
        title: product.title,
        brandName: product.brandName,
        image: product.imageUrl,
        priceNaira,
      },
      qty,
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-24 md:pb-0">

      {/* Brand name — small, muted, above title */}
      <p className="font-sans text-sm font-medium text-text-secondary">{product.brandName}</p>

      {/* Title */}
      <h1 className="font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
        {product.title}
      </h1>

      {/* Star rating — shown directly under title if available */}
      {product.rating !== undefined && (
        <StarRow rating={product.rating} count={product.reviewCount} />
      )}

      {/* Price */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-text-primary md:text-[38px]">
            {formatNaira(toNaira(displayPrice, displayCurrency))}
          </span>
          {product.tag && (
            <span
              className={`rounded-full px-3 py-1 font-sans text-xs font-semibold ${
                product.tag === "new" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"
              }`}
            >
              {product.tag === "new" ? "New Arrival" : "Best Seller"}
            </span>
          )}
        </div>
        <p className="mt-1.5 font-sans text-xs text-text-muted md:text-sm">
          Delivered to Nigeria in <span className="font-semibold text-text-primary">7–14 days</span> · price includes shipping &amp; KOI delivery
        </p>
      </div>

      {/* ── Colour selector ── */}
      {colorOption && colorOption.values.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-sans text-sm font-medium text-text-primary">
            Colour
            {selectedColor && (
              <span className="ml-1.5 font-normal text-text-secondary">— {selectedColor}</span>
            )}
          </p>

          <div className="flex flex-wrap gap-2.5">
            {colorOption.values.map((value) => {
              const imgSrc = colorImages[value];
              const hex = !imgSrc ? colorFallbackHex(value) : null;
              const active = selectedColor === value;
              return (
                <button
                  key={value}
                  type="button"
                  title={value}
                  onClick={() => handleColorSelect(value)}
                  aria-label={value}
                  aria-pressed={active}
                  className={`relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] border-2 transition-all duration-150 ${
                    active
                      ? "border-primary shadow-md scale-105"
                      : "border-border hover:border-text-secondary"
                  }`}
                >
                  {imgSrc ? (
                    <Image src={imgSrc} alt={value} fill sizes="52px" className="object-cover" />
                  ) : hex ? (
                    <span className="block h-full w-full" style={{ backgroundColor: hex }} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-surface-secondary font-sans text-[9px] font-medium leading-none text-text-primary">
                      {value.slice(0, 4)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Size selector ── */}
      {sizeOption && sizeOption.values.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm font-medium text-text-primary">Select Size</p>
            <a
              href="https://www.sizeguide.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-sans text-xs font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              <Ruler className="h-3.5 w-3.5" />
              Size Guide
            </a>
          </div>

          {/* Grid: 4 cols on mobile, 5 on sm, 6 on lg */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 sm:gap-2 lg:grid-cols-4 xl:grid-cols-6">
            {sizeOption.values.map((value) => {
              const available =
                !colorOption ||
                availableSizesForColor.size === 0 ||
                availableSizesForColor.has(value);
              const active = selectedSize === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available}
                  onClick={() => setSelectedSize(active ? null : value)}
                  aria-pressed={active}
                  className={`flex min-h-[44px] items-center justify-center rounded-button border py-3 text-center font-sans text-sm font-medium transition-all duration-150 md:min-h-0 md:py-2.5 ${
                    !available
                      ? "cursor-not-allowed border-border bg-surface text-text-muted opacity-40 line-through"
                      : active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-surface text-text-primary hover:border-text-secondary"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add to cart (desktop inline row — sticky bar handles mobile) ── */}
      <div className="flex flex-col gap-3 pt-1">
        {needsSize ? (
          <div className="hidden w-full cursor-default select-none items-center justify-center gap-2 rounded-button bg-primary/30 px-6 py-4 font-display text-base font-medium text-primary-foreground md:inline-flex">
            Select a size to continue
          </div>
        ) : (
          <div className="hidden items-center gap-3 md:flex">
            <QtyStepper qty={qty} setQty={setQty} size="lg" />
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-[58px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-display text-[17px] font-bold text-primary-foreground transition-all duration-150 hover:bg-primary-hover"
            >
              Add to Cart · {formatNaira(priceNaira * qty)}
            </button>
          </div>
        )}
      </div>

      {/* ── Product Details — flat, always visible ── */}
      <div className="border-t border-border pt-[22px]">
        <h2 className="mb-2.5 font-display text-[13px] font-extrabold text-text-primary">
          Product Details
        </h2>
        <p className="mb-[18px] font-sans text-sm leading-[1.7] text-text-secondary">
          {product.description || "No additional details available."}
        </p>
        <div className="flex flex-col gap-2.5">
          {TRUST_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2.5">
              <span className="shrink-0 font-sans text-sm font-black leading-[1.5] text-success">✓</span>
              <span className="font-sans text-[13px] leading-[1.5] text-text-secondary">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reviews accordion ── */}
      <div>
        {/* Reviews — stars inline in the header */}
        <AccordionSection
          title={`Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}`}
          headerRight={
            product.rating !== undefined ? (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${
                      n <= Math.round(product.rating!) ? "fill-warning text-warning" : "fill-border text-border"
                    }`}
                  />
                ))}
              </div>
            ) : undefined
          }
        >
          {product.rating !== undefined ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="font-display text-5xl font-bold text-text-primary">
                  {product.rating.toFixed(1)}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-5 w-5 ${
                          n <= Math.round(product.rating!) ? "fill-warning text-warning" : "fill-border text-border"
                        }`}
                      />
                    ))}
                  </div>
                  {product.reviewCount && (
                    <span className="font-sans text-sm text-text-muted">
                      Based on {product.reviewCount.toLocaleString()} reviews
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="font-sans text-sm text-text-muted">No reviews yet.</p>
          )}
        </AccordionSection>
      </div>

      {/* ── Sticky mobile add-to-cart bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-border bg-surface/95 px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        {needsSize ? (
          <div className="flex h-[52px] w-full cursor-default select-none items-center justify-center gap-2 rounded-2xl bg-primary/30 font-display text-sm font-medium text-primary-foreground">
            Select a size to continue
          </div>
        ) : (
          <div className="mx-auto flex max-w-[520px] items-center gap-3">
            <QtyStepper qty={qty} setQty={setQty} size="sm" />
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-display text-base font-bold text-primary-foreground transition-all duration-150 hover:bg-primary-hover"
            >
              Add to Cart · {formatNaira(priceNaira * qty)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QtyStepper({
  qty,
  setQty,
  size = "lg",
}: {
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  size?: "sm" | "lg";
}) {
  const height = size === "lg" ? "h-[58px]" : "h-[52px]";
  const btnWidth = size === "lg" ? "w-11" : "w-10";
  return (
    <div className={`flex ${height} shrink-0 items-center overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => setQty((q) => Math.max(1, q - 1))}
        className={`flex h-full ${btnWidth} items-center justify-center text-text-primary transition-colors hover:bg-surface-secondary`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[26px] text-center font-display text-sm font-black text-text-primary">
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => setQty((q) => q + 1)}
        className={`flex h-full ${btnWidth} items-center justify-center text-text-primary transition-colors hover:bg-surface-secondary`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
