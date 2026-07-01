"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types";

type Props = {
  initialProducts: Product[];
  initialTotal: number;
  categoryOptions: string[];
  pageSize: number;
};

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function fetchProductPage(
  categories: string[],
  page: number,
  pageSize: number,
): Promise<{ products: Product[]; total: number }> {
  const params = new URLSearchParams();
  categories.forEach((c) => params.append("category", c));
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const res = await fetch(`/api/products/list?${params.toString()}`);
  const json = (await res.json()) as { success: boolean; data: Product[]; total: number };
  if (!json.success) return { products: [], total: 0 };
  return { products: json.data, total: json.total };
}

export function ProductListingPage({ initialProducts, initialTotal, categoryOptions, pageSize }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const isFirstRender = useRef(true);
  // Every fetch (filter refetch, search, load-more, clear) claims the next id before
  // awaiting. A response only gets applied if it's still the latest request in flight —
  // this is what prevents a slow/stale response from clobbering newer state
  // (e.g. a delayed "coat" search result overwriting a "coat shoes" search, or an
  // in-flight search response landing after the user has already cleared the box).
  const requestIdRef = useRef(0);

  // Refetch page 1 from the DB whenever the category filter changes (search box is empty).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchQuery.trim()) return;

    const requestId = ++requestIdRef.current;
    setIsFilterLoading(true);
    fetchProductPage(selectedCategories, 1, pageSize).then((result) => {
      if (requestId !== requestIdRef.current) return;
      setProducts(result.products);
      setTotal(result.total);
      setPage(1);
    }).finally(() => {
      if (requestId === requestIdRef.current) setIsFilterLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories]);

  const handleLoadMore = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchProductPage(selectedCategories, nextPage, pageSize);
      if (requestId !== requestIdRef.current) return;
      setProducts((current) => [...current, ...result.products]);
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  }, [page, selectedCategories, pageSize]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Clearing search returns to the current category-filtered DB listing.
      const requestId = ++requestIdRef.current;
      setIsFilterLoading(true);
      fetchProductPage(selectedCategories, 1, pageSize).then((result) => {
        if (requestId !== requestIdRef.current) return;
        setProducts(result.products);
        setTotal(result.total);
        setPage(1);
      }).finally(() => {
        if (requestId === requestIdRef.current) setIsFilterLoading(false);
      });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json() as { success: boolean; data: Product[] };
        if (requestId !== requestIdRef.current) return;
        if (json.success) {
          setProducts(json.data);
          setTotal(json.data.length);
        }
      } catch {
        // keep current products on error
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false);
      }
    }, 400);
  }, [selectedCategories, pageSize]);

  const toggleCategory = (value: string) => {
    setSelectedCategories((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const hasMore = !isSearchActive && products.length < total;
  const isBusy = isFilterLoading || isSearching;

  const renderCategoryGroup = (onSelect?: () => void) => (
    <div className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsCategoryOpen((v) => !v)}
      >
        <span className="font-display text-sm font-semibold text-text-primary">Category</span>
        {isCategoryOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
      {isCategoryOpen && (
        <div className="mt-4 space-y-3">
          {categoryOptions.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary">
              <input
                type="checkbox"
                checked={selectedCategories.includes(value)}
                onChange={() => {
                  toggleCategory(value);
                  onSelect?.();
                }}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>{toLabel(value)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col gap-4 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">
              All Products <span className="text-text-muted">({total})</span>
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
            {isBusy && (
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
                    {renderCategoryGroup()}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex items-center justify-between text-sm text-text-secondary lg:hidden">
              <span>{isSearchActive ? products.length : total} products</span>
            </div>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <p className="font-display text-lg font-semibold text-text-primary">
                  No products found
                </p>
                <p className="font-sans text-sm text-text-muted">
                  Try removing some filters to see more results.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="inline-flex items-center justify-center rounded-button border border-border bg-surface px-6 py-2.5 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center justify-center rounded-button border border-border bg-surface px-8 py-3 font-display text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
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
                {renderCategoryGroup(closeMobileFilters)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
