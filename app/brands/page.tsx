import { Reveal } from "@/components/motion/Reveal";
import { BrandsGrid } from "@/components/catalog/BrandsGrid";
import { FEATURED_BRANDS } from "@/lib/mock-data";

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
        <Reveal>
          <div className="mb-10 flex flex-col gap-2 border-b border-border pb-8">
            <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">
              All Brands
            </h1>
            <p className="font-sans text-base text-text-secondary">
              Browse global brands — buy on their site, let KOI deliver to you.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <BrandsGrid brands={FEATURED_BRANDS} />
        </Reveal>
      </div>
    </div>
  );
}
