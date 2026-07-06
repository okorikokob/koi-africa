import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { BrandSummary } from "@/lib/catalog-db";

type Props = {
  summaries: BrandSummary[];
};

export function FeaturedBrands({ summaries }: Props) {
  const featured = summaries.slice(0, 7);

  return (
    <section className="w-full max-w-[1680px] px-5 py-10 md:mx-auto md:px-30 md:py-[72px]">
      <div className="mb-6 flex items-start justify-between gap-3 md:mb-[38px] md:items-end">
        <div>
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary md:text-[11px] md:tracking-[3px]">
            Top Brands
          </div>
          <div className="text-2xl font-black leading-[1.15] text-text-primary md:text-[38px] md:tracking-[-1px]">
            Shop by Brand
          </div>
        </div>
        <Link
          href="/brands"
          className="mt-1 flex-shrink-0 whitespace-nowrap font-sans text-[13px] font-bold text-primary hover:underline md:text-[15px]"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
        {featured.map(({ brand, productCount, imageUrl }, index) => {
          const isFeatureCard = index === 0;

          return (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className={`group relative block ${
                isFeatureCard ? "col-span-2 md:col-span-1 md:row-span-2" : ""
              }`}
            >
              <div
                className={`relative w-full overflow-hidden rounded-[18px] bg-surface-secondary transition-transform duration-300 group-hover:-translate-y-1 md:rounded-2xl ${
                  isFeatureCard
                    ? "aspect-[16/9] md:aspect-auto md:h-full"
                    : "aspect-[3/4]"
                }`}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={brand.name}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary-soft">
                    <span className="font-display text-4xl font-black text-primary">
                      {brand.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)",
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                  <span className="mb-1.5 inline-block w-fit rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[1.5px] text-white/90 backdrop-blur-sm">
                    {brand.category}
                  </span>
                  <span
                    className={`mb-0.5 font-black leading-none text-white ${
                      isFeatureCard ? "text-[26px] md:text-[32px]" : "text-[20px] md:text-[24px]"
                    }`}
                  >
                    {brand.name}
                  </span>
                  <span className="text-xs font-medium text-white/55">
                    {productCount > 0 ? `${productCount}+ products` : "New arrivals"}
                  </span>
                </div>
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-primary opacity-0 transition-all duration-150 group-hover:bg-primary group-hover:text-white group-hover:opacity-100">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
