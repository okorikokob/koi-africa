import { Hero } from "@/components/home/Hero";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { TrendingBanner } from "@/components/home/TrendingBanner";
import { CategoryBanners } from "@/components/home/CategoryBanners";
import { HowItWorks } from "@/components/home/HowItWorks";
import { getFeaturedProducts } from "@/lib/catalog-db";
import { FEATURED_PRODUCTS } from "@/lib/mock-data";

export default async function HomePage() {
  const dbFeatured = await getFeaturedProducts(8);
  const featuredProducts = dbFeatured.length > 0 ? dbFeatured : FEATURED_PRODUCTS.slice(0, 8);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <Hero />
      <FeaturedBrands />
      <FeaturedProducts
        products={featuredProducts}
        heading="Featured products"
        viewAllHref="/products"
      />
      <TrendingBanner />
      <CategoryBanners />
      <HowItWorks />
    </div>
  );
}
