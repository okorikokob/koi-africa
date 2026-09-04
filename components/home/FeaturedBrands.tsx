import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { brandImageOverride } from "@/lib/brand-visuals";
import type { BrandSummary } from "@/lib/catalog-db";
import type { Brand } from "@/types";

type Props = {
  summaries: BrandSummary[];
  comingSoon: Brand[];
};

function ComingSoonBrand({ brand }: { brand: Brand }) {
  return (
    <div className="w-[112px] shrink-0 text-center md:w-[132px] lg:w-[148px] xl:w-[156px]">
      <div className="mx-auto flex aspect-square w-full items-center justify-center rounded-full border border-dashed border-border bg-surface-secondary">
        <span className="font-display text-2xl font-black text-text-muted md:text-3xl">
          {brand.name.charAt(0)}
        </span>
      </div>
      <p className="mt-3.5 truncate font-sans text-sm font-bold text-text-primary md:text-[15px]">
        {brand.name}
      </p>
      <p className="mt-0.5 font-sans text-[10px] font-medium text-text-muted">Coming soon</p>
    </div>
  );
}

export function FeaturedBrands({ summaries, comingSoon }: Props) {
  const planned = comingSoon.slice(0, 5);

  return (
    <section className="w-full py-10 md:py-[72px]">
      <Reveal className="mx-auto mb-6 flex max-w-[1440px] items-end justify-between gap-3 px-5 md:mb-9 md:px-16">
        <div>
          <p className="mb-1.5 font-sans text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary md:text-[11px] md:tracking-[3px]">
            Shop the world
          </p>
          <h2 className="font-display text-2xl font-black leading-[1.15] text-text-primary md:text-[38px] md:tracking-[-1px]">
            Explore popular brands
          </h2>
        </div>
        <Link href="/brands" className="shrink-0 font-sans text-[13px] font-bold text-primary hover:underline md:text-[15px]">
          See all
        </Link>
      </Reveal>

      <div className="mx-auto flex max-w-[1440px] gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:gap-7 md:px-16 lg:justify-between lg:gap-8 [&::-webkit-scrollbar]:hidden">
        {summaries.map(({ brand, productCount, imageUrl }) => {
          const displayImage = imageUrl ?? brandImageOverride(brand.slug);
          return (
            <Link key={brand.id} href={`/brands/${brand.slug}`} className="group w-[112px] shrink-0 text-center md:w-[132px] lg:w-[148px] xl:w-[156px]">
              <div className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-primary bg-surface shadow-sm transition-all duration-250 ease-out group-hover:-translate-y-1 group-hover:shadow-md">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt={`${brand.name} products`}
                    fill
                    sizes="(min-width: 1280px) 156px, (min-width: 1024px) 148px, (min-width: 768px) 132px, 112px"
                    className="object-cover transition-transform duration-250 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-primary-soft">
                    <span className="font-display text-3xl font-black text-primary">{brand.name.charAt(0)}</span>
                  </div>
                )}
                <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <p className="mt-3.5 truncate font-sans text-sm font-bold text-text-primary md:text-[15px]">{brand.name}</p>
              <p className="mt-0.5 font-sans text-[10px] font-medium text-text-muted">
                {productCount} {productCount === 1 ? "product" : "products"}
              </p>
            </Link>
          );
        })}
        {planned.map((brand) => <ComingSoonBrand key={brand.id} brand={brand} />)}
      </div>
    </section>
  );
}
