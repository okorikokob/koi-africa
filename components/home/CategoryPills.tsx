"use client";

import { useState } from "react";

const CATEGORIES = [
  { label: "All", emoji: "" },
  { label: "Fashion", emoji: "👗" },
  { label: "Beauty", emoji: "💄" },
  { label: "Shoes", emoji: "👟" },
  { label: "Tech", emoji: "📱" },
  { label: "Luxury", emoji: "💎" },
  { label: "Home", emoji: "🏠" },
  { label: "Kids", emoji: "👶" },
];

export function CategoryPills() {
  const [active, setActive] = useState("All");

  return (
    <div className="bg-background pt-8 pb-2 md:pt-16 md:pb-6">
      <div className="mb-3.5 px-5 md:mx-auto md:mb-6 md:max-w-[1680px] md:px-16 md:text-center">
        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary md:text-[11px] md:tracking-[3px]">
          Browse by
        </div>
        <div className="text-2xl font-black leading-[1.15] text-text-primary md:text-[38px] md:tracking-[-1px]">
          What are you shopping for?
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-5 [scrollbar-width:none] md:mx-auto md:max-w-[1680px] md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-16 md:pb-2 [&::-webkit-scrollbar]:hidden">
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
    </div>
  );
}
