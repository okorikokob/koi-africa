import Link from "next/link";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";
import type { Product } from "@/types";

type Props = {
  products: Product[];
  heading?: string;
  viewAllHref?: string;
};

export function FeaturedProducts({
  products,
  heading = "Featured products",
  viewAllHref = "/products",
}: Props) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-8 md:py-16">
      <Reveal className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-text-primary md:text-4xl">
          {heading}
        </h2>
        <Link
          href={viewAllHref}
          className="whitespace-nowrap font-sans text-sm font-medium text-primary hover:text-primary-hover"
        >
          View all
        </Link>
      </Reveal>

      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
