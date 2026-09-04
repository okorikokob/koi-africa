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

export function AllBrandsGrid({ summaries, comingSoon }: Props) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-14 px-5 py-10 md:px-16 md:py-16">
      <section>
        <Reveal className="mb-6">
          <p className="font-sans text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary">Available now</p>
          <h2 className="mt-1 font-display text-2xl font-black text-text-primary md:text-3xl">Shop verified brands</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ brand, productCount, imageUrl }) => {
            const displayImage = imageUrl ?? brandImageOverride(brand.slug);
            return (
              <Link key={brand.id} href={`/brands/${brand.slug}`} className="group flex items-center gap-5 rounded-card border border-border bg-surface p-4 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-md">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-primary-soft">
                  {displayImage ? <Image src={displayImage} alt="" fill sizes="96px" className="object-cover transition-transform duration-250 group-hover:scale-[1.03]" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-black text-text-primary">{brand.name}</p>
                  <p className="mt-1 font-sans text-xs text-text-secondary">{productCount} verified products</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <Reveal className="mb-6">
          <p className="font-sans text-[10px] font-extrabold uppercase tracking-[2.5px] text-text-muted">Expanding the marketplace</p>
          <h2 className="mt-1 font-display text-2xl font-black text-text-primary md:text-3xl">More brands coming soon</h2>
          <p className="mt-2 max-w-2xl font-sans text-sm text-text-secondary">These brands are not available to shop yet. We will open them only after their catalogues and checkout paths are verified.</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {comingSoon.map((brand) => (
            <div key={brand.id} className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface-secondary p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface font-display text-lg font-black text-text-muted">{brand.name.charAt(0)}</div>
              <div className="min-w-0">
                <p className="truncate font-sans text-sm font-bold text-text-primary">{brand.name}</p>
                <p className="font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
