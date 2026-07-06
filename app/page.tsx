import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { CategoryPills } from "@/components/home/CategoryPills";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { PromoBanner } from "@/components/home/PromoBanner";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";
import { getFeaturedProducts, getBrandSummaries } from "@/lib/catalog-db";
import { FEATURED_PRODUCTS, FEATURED_BRANDS } from "@/lib/mock-data";
import Link from "next/link";

export default async function HomePage() {
  const [dbFeatured, brandSummaries] = await Promise.all([
    getFeaturedProducts(8),
    getBrandSummaries(FEATURED_BRANDS),
  ]);
  const trendingProducts = (dbFeatured.length > 0 ? dbFeatured : FEATURED_PRODUCTS).slice(0, 4);

  return (
    <div className="flex flex-col">
      <Hero />
      <Marquee />
      <CategoryPills />
      <FeaturedBrands summaries={brandSummaries} />

      <div className="bg-surface-secondary px-5 py-8 md:py-0">
        <div className="md:mx-auto md:max-w-[1680px] md:px-16 md:py-[72px]">
          <Reveal className="mb-5 flex items-start justify-between gap-3 md:mb-[38px] md:items-end">
            <div>
              <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary md:text-[11px] md:tracking-[3px]">
                Trending
              </div>
              <div className="text-2xl font-black leading-[1.15] text-text-primary md:text-[38px] md:tracking-[-1px]">
                Hot right now 🔥
              </div>
            </div>
            <Link
              href="/products"
              className="mt-1 flex-shrink-0 whitespace-nowrap font-sans text-[13px] font-bold text-primary hover:underline md:text-[15px]"
            >
              View all
            </Link>
          </Reveal>
          <ProductGrid products={trendingProducts} />
        </div>
      </div>

      <PromoBanner />
      <HowItWorks />
    </div>
  );
}
