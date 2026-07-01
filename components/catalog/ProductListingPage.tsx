"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types";

type Props = {
  initialProducts: Product[];
};

const PAGE_SIZE = 9;

type FilterGroupKey = "category" | "brand" | "price" | "source";

type FilterGroup = {
  key: FilterGroupKey;
  title: string;
  options: Array<{ label: string; value: string }>;
};

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "category",
    title: "Category",
    options: [
      { label: "Fashion", value: "fashion" },
      { label: "Beauty", value: "beauty" },
      { label: "Tech", value: "tech" },
      { label: "Home", value: "home" },
      { label: "Kids", value: "kids" },
    ],
  },
  {
    key: "brand",
    title: "Brand",
    options: [
      { label: "Nike", value: "Nike" },
      { label: "Zara", value: "Zara" },
      { label: "Sephora", value: "Sephora" },
      { label: "Apple", value: "Apple" },
      { label: "Adidas", value: "Adidas" },
      { label: "Mango", value: "Mango" },
    ],
  },
  {
    key: "price",
    title: "Price",
    options: [
      { label: "$0–$50", value: "0-50" },
      { label: "$50–$100", value: "50-100" },
      { label: "$100–$250", value: "100-250" },
      { label: "$250+", value: "250+" },
    ],
  },
  {
    key: "source",
    title: "Source",
    options: [
      { label: "UK", value: "UK" },
      { label: "US", value: "US" },
    ],
  },
];

function toggleSelection(value: string, selected: string[], setter: (value: string[]) => void) {
  if (selected.includes(value)) {
    setter(selected.filter((item) => item !== value));
    return;
  }

  setter([...selected, value]);
}

function matchesPriceRange(product: Product, value: string) {
  if (value === "0-50") {
    return product.priceAmount <= 50;
  }

  if (value === "50-100") {
    return product.priceAmount > 50 && product.priceAmount <= 100;
  }

  if (value === "100-250") {
    return product.priceAmount > 100 && product.priceAmount <= 250;
  }

  if (value === "250+") {
    return product.priceAmount > 250;
  }

  return true;
}

export function ProductListingPage({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setProducts(initialProducts);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json() as { success: boolean; data: Product[] };
        if (json.success) setProducts(json.data);
      } catch {
        // keep current products on error
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [initialProducts]);

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [openGroups, setOpenGroups] = useState<Record<FilterGroupKey, boolean>>({
    category: true,
    brand: true,
    price: true,
    source: true,
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brandName);
      const priceMatch = selectedPrices.length === 0 || selectedPrices.some((value) => matchesPriceRange(product, value));
      const sourceMatch = selectedSources.length === 0 || selectedSources.includes(product.source ?? "US");

      return categoryMatch && brandMatch && priceMatch && sourceMatch;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => a.priceAmount - b.priceAmount);
        break;
      case "price-high":
        sorted.sort((a, b) => b.priceAmount - a.priceAmount);
        break;
      case "newest":
        sorted.sort((a, b) => Number(b.tag === "new") - Number(a.tag === "new"));
        break;
      default:
        sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
        break;
    }

    return sorted;
  }, [products, selectedCategories, selectedBrands, selectedPrices, selectedSources, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategories, selectedBrands, selectedPrices, selectedSources, sortBy]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const toggleGroup = (key: FilterGroupKey) => {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  const renderFilterGroup = (group: FilterGroup, onSelect?: () => void) => {
    const isOpen = openGroups[group.key];
    const selectedValues =
      group.key === "category"
        ? selectedCategories
        : group.key === "brand"
          ? selectedBrands
          : group.key === "price"
            ? selectedPrices
            : selectedSources;

    const setter =
      group.key === "category"
        ? setSelectedCategories
        : group.key === "brand"
          ? setSelectedBrands
          : group.key === "price"
            ? setSelectedPrices
            : setSelectedSources;

    return (
      <div key={group.key} className="border-t border-border py-5 first:border-t-0 first:pt-0">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => toggleGroup(group.key)}
        >
          <span className="font-display text-sm font-semibold text-text-primary">
            {group.title}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
        </button>
        {isOpen && (
          <div className="mt-4 space-y-3">
            {group.options.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => {
                    toggleSelection(option.value, selectedValues, setter);
                    onSelect?.();
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col gap-4 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">
              All Products <span className="text-text-muted">({products.length})</span>
            </h1>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-9 pr-9 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setIsFiltersVisible((value) => !value)}
              className="hidden items-center gap-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:text-primary md:inline-flex"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isFiltersVisible ? "Hide Filters" : "Show Filters"}
            </button>
            <label className="flex items-center gap-2 font-sans text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Sort By</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent pr-1 font-medium text-text-primary outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-10 border-t border-border pt-8 lg:gap-14">
          <div className="hidden lg:block">
            <AnimatePresence initial={false}>
              {isFiltersVisible && (
                <motion.aside
                  key="filters-sidebar"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 220, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="w-[220px] space-y-1">
                    {FILTER_GROUPS.map((group) => renderFilterGroup(group))}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex items-center justify-between text-sm text-text-secondary lg:hidden">
              <span>{filteredProducts.length} products</span>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <p className="font-display text-lg font-semibold text-text-primary">
                  No products found
                </p>
                <p className="font-sans text-sm text-text-muted">
                  Try removing some filters to see more results.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedBrands([]);
                    setSelectedPrices([]);
                    setSelectedSources([]);
                  }}
                  className="inline-flex items-center justify-center rounded-button border border-border bg-surface px-6 py-2.5 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <ProductGrid products={visibleProducts} />
            )}

            {hasMore && filteredProducts.length > 0 && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="inline-flex items-center justify-center rounded-button border border-border bg-surface px-8 py-3 font-display text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 h-full w-full bg-black/20"
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label="Close filters"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 flex w-[85vw] max-w-[320px] flex-col bg-background p-6 shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-text-primary">Filters</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-text-secondary"
                  onClick={() => setIsMobileFiltersOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {FILTER_GROUPS.map((group) => renderFilterGroup(group, closeMobileFilters))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
