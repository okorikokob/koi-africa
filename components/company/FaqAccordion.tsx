"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type FaqCategory = "order" | "pay" | "ship" | "trust";

export type FaqItem = {
  icon: string;
  question: string;
  answer: string;
  category: FaqCategory;
};

const CATEGORIES: { key: FaqCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "order", label: "Ordering" },
  { key: "pay", label: "Payment" },
  { key: "ship", label: "Shipping" },
  { key: "trust", label: "Trust & Safety" },
];

type Props = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesSearch =
        !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, category]);

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
        <Search className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a question…"
          className="w-full border-none bg-transparent font-sans text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4.5 py-2.5 font-sans text-sm font-semibold transition-colors ${
              category === c.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-text-secondary hover:bg-surface-secondary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center font-sans text-sm text-text-secondary">
          No questions match your search. Try different words, or contact us directly.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={item.question}
                className={`rounded-2xl border bg-surface transition-colors ${isOpen ? "border-primary" : "border-border"}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center gap-3.5 px-4.5 py-4"
                  aria-expanded={isOpen}
                >
                  <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-[15px]">
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left font-sans text-[14.5px] font-bold leading-[1.4] text-text-primary">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`}
                    strokeWidth={2}
                  />
                </button>
                {isOpen && (
                  <p className="px-4.5 pb-5 pl-[66px] font-sans text-[13.5px] leading-[1.65] text-text-secondary">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
