"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ClipboardList, Package, Star, ChevronDown, Ruler } from "lucide-react";
import { BuyOnVendorButton } from "@/components/product/BuyOnVendorButton";
import type { Product } from "@/types";
import type { ProductVariant } from "@/lib/shopify-catalog";

type Props = {
  product: Product;
  onColorChange?: (colorName: string, images: string[]) => void;
};

const STEPS = [
  { icon: ShoppingBag, label: "Buy on vendor site" },
  { icon: ClipboardList, label: "Submit your order on KOI" },
  { icon: Package, label: "We deliver to your door" },
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

  // Prefer variant productUrl (vendor page with color+size pre-selected).
  // If no variant matched (MCP only returns 1 variant), fall back to the product page URL
  // so the user lands on the vendor product page and can pick their color there.
  const buyUrl =
    selectedVariant?.productUrl ||
    selectedVariant?.checkoutUrl ||
    product.productPageUrl ||
    product.vendorUrl;
  const displayPrice = selectedVariant?.price ?? product.priceAmount;
  const displayCurrency = selectedVariant?.currency ?? product.priceCurrency;
  const needsSize = !!sizeOption && !selectedSize;

  return (
    <div className="flex flex-col gap-5">

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
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-text-primary">
          {displayCurrency}{" "}
          {displayPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="font-sans text-sm text-text-muted">vendor price</span>
      </div>

      {/* Tag chip */}
      {product.tag && (
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 font-sans text-xs font-semibold ${
              product.tag === "new"
                ? "bg-primary/10 text-primary"
                : "bg-error/10 text-error"
            }`}
          >
            {product.tag === "new" ? "New Arrival" : "Best Seller"}
          </span>
        </div>
      )}

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
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6">
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
                  className={`rounded-button border py-2.5 text-center font-sans text-sm font-medium transition-all duration-150 ${
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

      {/* ── CTAs ── */}
      <div className="flex flex-col gap-3 pt-1">
        {needsSize ? (
          <div className="inline-flex w-full cursor-default select-none items-center justify-center gap-2 rounded-button bg-primary/30 px-6 py-4 font-display text-base font-medium text-primary-foreground">
            Select a size to continue
          </div>
        ) : (
          <BuyOnVendorButton vendorUrl={buyUrl} vendorName={product.vendorName} />
        )}

        <Link
          href="/order/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-button border border-border bg-surface px-6 py-3.5 font-display text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
        >
          Already bought it? Submit your order →
        </Link>

        <p className="text-center font-sans text-xs text-text-muted">
          Buy on the vendor&apos;s site first, then return here to arrange delivery.
        </p>
      </div>

      {/* ── Accordions ── */}
      <div className="mt-2">
        <AccordionSection title="Product Details" defaultOpen={!!product.description}>
          {product.description ? (
            <p className="font-sans text-sm leading-relaxed text-text-secondary">
              {product.description}
            </p>
          ) : (
            <p className="font-sans text-sm text-text-muted">No additional details available.</p>
          )}
        </AccordionSection>

        <AccordionSection title="Shipping & Returns">
          <div className="flex flex-col gap-2.5">
            {[
              "Pay the vendor in their currency on their site",
              "Come back to KOI and submit your order details",
              "KOI reviews and quotes your delivery fee in NGN",
              "Pay the delivery fee via Paystack — no foreign card needed",
              "KOI ships internationally and delivers to your door",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="font-sans text-sm leading-relaxed text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </AccordionSection>

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
              <a
                href={product.vendorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm font-medium text-primary transition-colors duration-150 hover:underline"
              >
                See all reviews on vendor site →
              </a>
            </div>
          ) : (
            <p className="font-sans text-sm text-text-muted">No reviews yet.</p>
          )}
        </AccordionSection>

        {/* How KOI Works */}
        <AccordionSection title="How KOI Works">
          <div className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                </div>
                <span className="font-sans text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{i + 1}.</span> {step.label}
                </span>
              </div>
            ))}
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
