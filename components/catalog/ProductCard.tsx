"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart, Star, Truck, ShieldCheck } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/lib/cart-context";
import { formatPriceAsNaira, toNaira } from "@/lib/currency";
import { useDisplayCurrency } from "@/components/currency/DisplayCurrencyProvider";

type Props = {
  product: Product;
};

function badgeClasses(tag?: Product["tag"]) {
  switch (tag) {
    case "bestseller":
      return "bg-error text-white";
    case "new":
      return "bg-primary text-white";
    default:
      return "bg-success text-white";
  }
}

function badgeLabel(tag?: Product["tag"]) {
  switch (tag) {
    case "bestseller":
      return "🔥 Hot";
    case "new":
      return "New";
    default:
      return "Sale";
  }
}

function toProductHref(product: Product): string {
  // `product.id` is the InsForge row id — the detail page reads full data
  // (gallery, colors, variants) from the DB, so no payload needs to travel in the URL.
  return `/products/${product.id}`;
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const displayPricing = useDisplayCurrency();
  const [wished, setWished] = useState(false);

  const isNike = product.brandName.trim().toLowerCase() === "nike"
    || product.vendorName.trim().toLowerCase() === "nike";
  const nikePrice = isNike
    ? displayPricing.nikeSellingPrice(product.priceAmount, product.priceCurrency)
    : null;
  const priceNaira = nikePrice
    ? nikePrice.sellingMinorNgn / 100
    : toNaira(product.priceAmount, product.priceCurrency);
  const sourceCurrency = product.priceCurrency.toUpperCase();
  const sourcePrice = displayPricing.formatSourcePrice(product.priceAmount, sourceCurrency);
  const multiCurrencyPrice = displayPricing.formatPrice(product.priceAmount, sourceCurrency);
  const renderedPrice = nikePrice
    ? nikePrice.formatted
    : displayPricing.featureEnabled
    ? multiCurrencyPrice ?? sourcePrice ?? `${product.priceAmount} ${sourceCurrency}`
    : formatPriceAsNaira(product.priceAmount, product.priceCurrency);
  const sourcePriceLabel = displayPricing.selectedCurrency === sourceCurrency
    ? `Store price · ${sourceCurrency}`
    : sourcePrice ? `${sourcePrice} ${sourceCurrency} store price` : `Store price · ${sourceCurrency}`;

  return (
    <Link
      href={toProductHref(product)}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-secondary">
        <span
          className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-[3px] text-[9px] font-extrabold uppercase tracking-[0.5px] md:left-3 md:top-3 md:text-[10px] ${badgeClasses(product.tag)}`}
        >
          {badgeLabel(product.tag)}
        </span>
        <button
          type="button"
          aria-label="Add to wishlist"
          onClick={(e) => {
            e.preventDefault();
            setWished((w) => !w);
          }}
          className={`absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm transition-transform active:scale-125 md:right-3 md:top-3 md:h-[38px] md:w-[38px] ${
            wished ? "text-error" : "text-text-muted"
          }`}
        >
          <Heart
            className="h-[14px] w-[14px] md:h-[17px] md:w-[17px]"
            fill={wished ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover object-top transition-transform duration-[400ms] group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            No image
          </div>
        )}
      </div>
      <div className="p-3 md:p-[18px]">
        <p className="mb-1.5 line-clamp-2 min-h-[35px] font-sans text-[13px] font-semibold leading-[1.35] text-text-primary md:min-h-[42px] md:text-[15px]">
          {product.title}
        </p>

        {/* Trust signals */}
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-3.5">
          {product.rating !== undefined && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-text-primary md:text-[11px]">
              <Star className="h-[11px] w-[11px] fill-warning text-warning" />
              {product.rating.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted md:text-[11px]">
            <Truck className="h-[11px] w-[11px]" />
            7–14 day delivery
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted md:text-[11px]">
            <ShieldCheck className="h-[11px] w-[11px]" />
            Authentic
          </span>
        </div>

        <div className="flex items-end justify-between gap-1">
          <div>
            <div className="text-sm font-black text-text-primary md:text-[17px]">
              {renderedPrice}
            </div>
            {isNike ? (
              <div className="mt-px text-[10px] text-text-muted md:text-[11px]">
                KOI product price · logistics deposit at checkout
              </div>
            ) : displayPricing.featureEnabled ? (
              <>
                <div className="mt-px text-[10px] text-text-muted md:text-[11px]">{sourcePriceLabel}</div>
                <div className="text-[10px] text-text-muted md:text-[11px]">Delivery calculated separately</div>
              </>
            ) : (
              <div className="mt-px text-[10px] text-text-muted md:text-[11px]">+ KOI delivery</div>
            )}
          </div>
          <button
            type="button"
            disabled={product.available === false}
            onClick={(e) => {
              if (product.requiresVariantSelection || product.options?.length || product.available === false) return;
              e.preventDefault();
              addItem({
                productId: product.id,
                title: product.title,
                brandName: product.brandName,
                image: product.imageUrl,
                priceNaira,
                pricingModel: isNike ? "nike-margin-v1" : undefined,
              });
            }}
            className="flex-shrink-0 whitespace-nowrap rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-extrabold text-primary transition-colors duration-150 hover:bg-primary hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:rounded-[10px] md:px-4 md:py-[9px] md:text-xs"
          >
            {product.available === false
              ? product.availabilityStatus === "unknown" ? "Unavailable" : "Sold out"
              : product.requiresVariantSelection || product.options?.length ? "Select" : "+ Add"}
          </button>
        </div>
      </div>
    </Link>
  );
}
