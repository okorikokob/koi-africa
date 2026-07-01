"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";
import type { Product } from "@/types";

type Tab = {
  label: string;
  products: Product[];
};

type Props = {
  title: string;
  tabs: Tab[];
  viewAllHref?: string;
};

export function ProductRow({ title, tabs, viewAllHref }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const showTabs = tabs.length > 1;

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-8 md:py-16">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-text-primary md:text-4xl">
          {title}
        </h2>

        {showTabs ? (
          <div className="flex items-center gap-6">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`font-sans text-sm font-medium transition-colors duration-150 ${
                  index === activeTab
                    ? "text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : viewAllHref ? (
          <Link
            href={viewAllHref}
            className="whitespace-nowrap font-sans text-sm font-medium text-primary hover:text-primary-hover"
          >
            View all
          </Link>
        ) : null}
      </Reveal>

      <div className="mt-8">
        <ProductGrid products={tabs[activeTab].products} />
      </div>
    </section>
  );
}
