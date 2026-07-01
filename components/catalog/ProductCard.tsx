import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";

type Props = {
  product: Product;
};

function badgeClasses(tag?: Product["tag"]) {
  switch (tag) {
    case "new":
      return "text-primary";
    case "bestseller":
      return "text-error";
    default:
      return "text-success";
  }
}

function badgeLabel(tag?: Product["tag"]) {
  switch (tag) {
    case "new":
      return "New Arrival";
    case "bestseller":
      return "Best Seller";
    default:
      return "Featured";
  }
}

function toProductHref(product: Product): string {
  // `product.id` is the InsForge row id — the detail page reads full data
  // (gallery, colors, variants) from the DB, so no payload needs to travel in the URL.
  return `/products/${product.id}`;
}

export function ProductCard({ product }: Props) {
  return (
    <Link
      href={toProductHref(product)}
      className="group block overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow duration-250 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {product.tag && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full bg-surface px-3 py-1 font-sans text-[11px] font-medium shadow-sm ${badgeClasses(product.tag)}`}
          >
            {badgeLabel(product.tag)}
          </span>
        )}
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-250 group-hover:scale-[1.02]"
        />
      </div>
      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 font-display text-sm font-semibold text-text-primary">
            {product.title}
          </p>
          <p className="shrink-0 font-sans text-sm font-semibold text-text-primary">
            {product.priceCurrency} {product.priceAmount.toLocaleString()}
          </p>
        </div>
        <p className="font-sans text-sm text-text-secondary">{product.brandName}</p>
        <p className="font-sans text-xs text-text-muted">+ KOI delivery</p>
      </div>
    </Link>
  );
}
