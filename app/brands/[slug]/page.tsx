import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { FEATURED_BRANDS } from "@/lib/mock-data";
import { getProductsByBrand } from "@/lib/catalog-db";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = FEATURED_BRANDS.find((b) => b.slug === slug);

  if (!brand) notFound();

  const products = await getProductsByBrand(brand.name);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">

        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 font-sans text-sm text-text-muted">
          <Link href="/" className="transition-colors duration-150 hover:text-text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/brands" className="transition-colors duration-150 hover:text-text-primary">
            Brands
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-text-primary">{brand.name}</span>
        </nav>

        {/* Brand header */}
        <Reveal>
          <div className="mb-12 flex flex-col items-start gap-6 border-b border-border pb-10 md:flex-row md:items-center md:gap-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface shadow-sm md:h-24 md:w-24">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={96}
                height={96}
                className="object-contain"
              />
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">
                  {brand.name}
                </h1>
                <span className="rounded-full bg-primary-soft px-3 py-1 font-sans text-xs font-medium text-primary">
                  {brand.category}
                </span>
              </div>
              <p className="font-sans text-base text-text-secondary">
                {brand.description}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-display text-2xl font-bold text-text-primary">
                {products.length}
              </span>
              <span className="font-sans text-sm text-text-muted">
                product{products.length !== 1 ? "s" : ""} available
              </span>
            </div>
          </div>
        </Reveal>

        {/* Products */}
        {products.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="font-display text-lg font-semibold text-text-primary">
                No products yet for {brand.name}
              </p>
              <p className="font-sans text-sm text-text-muted">
                Check back soon — we add new products regularly.
              </p>
              <Link
                href="/brands"
                className="mt-2 inline-flex items-center justify-center rounded-button border border-border bg-surface px-5 py-2 font-sans text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary hover:text-primary"
              >
                Browse other brands
              </Link>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={0.1}>
            <ProductGrid products={products} />
          </Reveal>
        )}
      </div>
    </div>
  );
}
