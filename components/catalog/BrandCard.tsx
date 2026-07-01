import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Brand } from "@/types";

type Props = {
  brand: Brand;
};

export function BrandCard({ brand }: Props) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group relative flex flex-col items-center gap-4 rounded-card border border-border bg-surface p-7 text-center shadow-sm transition-all duration-250 hover:border-primary hover:shadow-md"
    >
      {/* Arrow top-right */}
      <ChevronRight className="absolute right-4 top-4 h-4 w-4 text-text-muted transition-colors duration-150 group-hover:text-primary" />

      {/* Monogram circle */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <span className="font-display text-2xl font-bold text-primary">
          {brand.name.charAt(0)}
        </span>
      </div>

      {/* Brand name */}
      <p className="font-display text-sm font-semibold text-text-primary">
        {brand.name}
      </p>

      {/* Category pill */}
      <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 font-sans text-xs font-medium text-text-secondary">
        {brand.category}
      </span>
    </Link>
  );
}
