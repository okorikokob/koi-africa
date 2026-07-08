"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import { brandGradient, brandImageOverride } from "@/lib/brand-visuals";
import type { BrandSummary } from "@/lib/catalog-db";

type Props = {
  summaries: BrandSummary[];
};

const CATEGORIES = [
  { label: "All", emoji: "" },
  { label: "Fashion", emoji: "👗" },
  { label: "Beauty", emoji: "💄" },
  { label: "Shoes", emoji: "👟" },
  { label: "Tech", emoji: "📱" },
  { label: "Luxury", emoji: "💎" },
  { label: "Home", emoji: "🏠" },
];

function BrandTile({ summary }: { summary: BrandSummary }) {
  const { brand, productCount, imageUrl } = summary;
  const override = brandImageOverride(brand.slug);
  const displayImage = override ?? imageUrl;

  return (
    <Link href={`/brands/${brand.slug}`} className="group block w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card shadow-sm transition-all duration-300 ease-out active:scale-[0.97] group-hover:-translate-y-2 group-hover:shadow-[0_20px_45px_-12px_rgba(0,74,173,0.45)] md:aspect-[4/5]">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={brand.name}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className={
              override
                ? "object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110"
                : "scale-[1.18] object-cover object-center saturate-[1.2] contrast-[1.06] transition-transform duration-500 ease-out group-hover:scale-[1.3]"
            }
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: brandGradient(brand.name) }}
          >
            <span className="font-display text-4xl font-black text-white/90 drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-110">
              {brand.name.charAt(0)}
            </span>
          </div>
        )}

        <div
          className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)",
          }}
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-[5px] p-3.5 md:p-5">
          <span className="rounded-full border border-white/20 bg-white/15 px-2 py-[3px] font-sans text-[9px] font-extrabold uppercase tracking-[1.5px] text-white/90 backdrop-blur-sm">
            {brand.category}
          </span>
          <span className="font-display text-xl font-black leading-none tracking-tight text-white drop-shadow-sm transition-transform duration-300 group-hover:translate-x-0.5 md:text-2xl">
            {brand.name}
          </span>
          <span className="font-sans text-[11px] font-medium text-white/70">
            {productCount > 0 ? `${productCount}+ products` : "New arrivals"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AllBrandsGrid({ summaries }: Props) {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All"
      ? summaries
      : summaries.filter((s) => s.brand.category.toLowerCase() === active.toLowerCase());

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <div className="flex w-full gap-2 overflow-x-auto px-5 pb-1 pt-4 [scrollbar-width:none] md:mx-auto md:max-w-[1440px] md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-16 md:pt-7 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActive(cat.label)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-[18px] py-[9px] font-sans text-[13px] font-semibold transition-all duration-150 md:px-[22px] md:text-sm ${
              active === cat.label
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {cat.emoji ? `${cat.emoji} ${cat.label}` : cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-24 text-center">
          <p className="font-display text-lg font-semibold text-text-primary">
            No brands in this category yet
          </p>
          <p className="font-sans text-sm text-text-muted">More brands are being added soon.</p>
          <button
            type="button"
            onClick={() => setActive("All")}
            className="mt-2 inline-flex items-center justify-center rounded-button border border-border bg-surface px-5 py-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            View all brands
          </button>
        </div>
      ) : (
        <StaggerGrid className="grid w-full grid-cols-2 gap-3 px-5 pb-10 md:mx-auto md:max-w-[1440px] md:grid-cols-4 md:gap-[22px] md:px-16 md:pb-9">
          {filtered.map((summary) => (
            <StaggerItem key={summary.brand.id} className="w-full">
              <BrandTile summary={summary} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
