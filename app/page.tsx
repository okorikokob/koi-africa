import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { CategoryPills } from "@/components/home/CategoryPills";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { PromoBanner } from "@/components/home/PromoBanner";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";
import { getFeaturedProducts, getBrandSummaries } from "@/lib/catalog-db";
import { toProductCardData } from "@/lib/catalog-helpers";
import { partitionMarketplaceBrands } from "@/lib/public-storefront-policy";

export const dynamic = "force-dynamic";
import { FEATURED_BRANDS } from "@/lib/mock-data";
import Link from "next/link";

export default async function HomePage() {
  const marketplaceBrands = partitionMarketplaceBrands(FEATURED_BRANDS);
  const [dbFeatured, brandSummaries] = await Promise.all([
    getFeaturedProducts(8),
    getBrandSummaries(marketplaceBrands.available),
  ]);
  const trendingProducts = dbFeatured.slice(0, 4).map(toProductCardData);

  return (
    <div className="flex flex-col">
      <Hero />
      <Marquee />
      <CategoryPills />
      <div className="mt-6 md:mt-10">
        <FeaturedBrands summaries={brandSummaries} comingSoon={marketplaceBrands.comingSoon} />
      </div>

      <div className="mt-6 bg-surface-secondary px-5 py-10 md:mt-10 md:py-6">
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
              href="/brands"
              className="mt-1 flex-shrink-0 whitespace-nowrap font-sans text-[13px] font-bold text-primary hover:underline md:text-[15px]"
            >
              View all
            </Link>
          </Reveal>
          {trendingProducts.length > 0 ? (
            <ProductGrid products={trendingProducts} />
          ) : (
            <div className="rounded-card border border-border bg-surface px-6 py-12 text-center font-sans text-sm text-text-muted">
              Fresh Nike arrivals are being prepared. Please check back shortly.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 md:mt-10">
        <PromoBanner />
      </div>
      <div className="mt-6 md:mt-10">
        <HowItWorks />
      </div>
    </div>
  );
}
