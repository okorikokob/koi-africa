import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { FEATURED_BRANDS } from "@/lib/mock-data";
import { getBrandCatalog } from "@/lib/catalog-db";
import { BrandProductsSection } from "@/components/catalog/BrandProductsSection";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = FEATURED_BRANDS.find((b) => b.slug === slug);

  if (!brand) notFound();

  const products = await getBrandCatalog(brand.name, brand.category);
  const heroImage = products[0]?.imageUrl;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative flex min-h-[180px] w-full flex-col justify-end overflow-hidden px-5 pb-8 pt-11 md:min-h-[280px] md:px-16 md:pb-12 md:pt-[70px]">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center saturate-[1.2] contrast-[1.05]"
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.05) 100%)",
          }}
        />
        <div className="relative z-[1] mx-auto w-full md:max-w-[1440px]">
          <Link
            href="/brands"
            className="mb-3 inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold text-white transition-colors duration-150 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Brands
          </Link>
          <h1 className="mb-1 font-display text-[30px] font-black leading-none text-white md:text-[48px]">
            {brand.name}
          </h1>
          <p className="mb-3.5 font-sans text-sm font-medium text-white md:mb-5 md:text-base">
            {brand.description}
          </p>
          <div className="flex gap-6">
            <div>
              <div className="font-display text-lg font-black leading-none text-white md:text-2xl">
                {products.length}+
              </div>
              <div className="mt-0.5 font-sans text-[10px] font-medium text-white/45">Products</div>
            </div>
            <div>
              <div className="font-display text-lg font-black leading-none text-white md:text-2xl">
                7–14d
              </div>
              <div className="mt-0.5 font-sans text-[10px] font-medium text-white/45">Delivery</div>
            </div>
            <div>
              <div className="font-display text-lg font-black leading-none text-white md:text-2xl">
                NGN
              </div>
              <div className="mt-0.5 font-sans text-[10px] font-medium text-white/45">Pay in</div>
            </div>
          </div>
        </div>
      </div>

      <BrandProductsSection products={products} />
    </div>
  );
}
