"use client";

import { useState } from "react";
import { BrandCard } from "@/components/catalog/BrandCard";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import type { Brand } from "@/types";

type Props = {
  brands: Brand[];
};

const CATEGORIES = ["All", "Fashion", "Beauty", "Tech"];

export function BrandsGrid({ brands }: Props) {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All"
      ? brands
      : brands.filter(
          (b) => b.category.toLowerCase() === active.toLowerCase(),
        );

  return (
    <div className="flex flex-col gap-8">
      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={`rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors duration-150 ${
              active === cat
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-surface text-text-secondary hover:border-primary hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto font-sans text-sm text-text-muted">
          {filtered.length} brand{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="font-display text-lg font-semibold text-text-primary">
            No brands in this category yet
          </p>
          <p className="font-sans text-sm text-text-muted">
            More brands are being added soon.
          </p>
          <button
            type="button"
            onClick={() => setActive("All")}
            className="mt-2 inline-flex items-center justify-center rounded-button border border-border bg-surface px-5 py-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            View all brands
          </button>
        </div>
      ) : (
        <StaggerGrid className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((brand) => (
            <StaggerItem key={brand.id}>
              <BrandCard brand={brand} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
