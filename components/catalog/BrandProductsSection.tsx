"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types";

type Props = {
  products: Product[];
};

const FILTERS = ["All", "New Arrivals", "Best Sellers", "Sale"] as const;

function matchesFilter(product: Product, filter: (typeof FILTERS)[number]): boolean {
  switch (filter) {
    case "All":
      return true;
    case "New Arrivals":
      return product.tag === "new";
    case "Best Sellers":
      return product.tag === "bestseller";
    case "Sale":
      return !product.tag;
  }
}

export function BrandProductsSection({ products }: Props) {
  const [active, setActive] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = products
    .filter((p) => matchesFilter(p, active))
    .filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <div className="w-full px-5 pt-4 md:mx-auto md:max-w-[1440px] md:px-16 md:pt-7">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this brand's products…"
            className="w-full rounded-button border border-border bg-surface py-2.5 pl-10 pr-4 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex w-full gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-auto md:max-w-[1440px] md:px-16 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-[18px] py-[9px] font-sans text-[13px] font-semibold transition-all duration-150 md:px-[22px] md:text-sm ${
              active === filter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-24 text-center">
          <p className="font-display text-lg font-semibold text-text-primary">
            No products match your search
          </p>
          <p className="font-sans text-sm text-text-muted">
            Try a different search term or filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setActive("All");
              setQuery("");
            }}
            className="mt-2 inline-flex items-center justify-center rounded-button border border-border bg-surface px-5 py-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            View all products
          </button>
        </div>
      ) : (
        <div className="w-full px-5 pb-10 md:mx-auto md:max-w-[1440px] md:px-16 md:pb-16">
          <ProductGrid products={filtered} />
        </div>
      )}
    </div>
  );
}
