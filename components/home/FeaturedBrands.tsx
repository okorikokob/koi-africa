import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";

const BRAND_NAMES = [
  "Nike",
  "Zara",
  "Sephora",
  "Apple",
  "Adidas",
  "Gucci",
  "Louis Vuitton",
  "H&M",
  "Dyson",
  "Fenty Beauty",
  "Levi's",
  "Mango",
  "Charlotte Tilbury",
  "New Balance",
  "ASOS",
  "The Ordinary",
  "Puma",
  "Hermès",
  "Samsung",
  "Uniqlo",
];

function MarqueeRow({ durationSeconds }: { durationSeconds: number }) {
  const brands = [...BRAND_NAMES, ...BRAND_NAMES];

  return (
    <div className="relative flex overflow-hidden">
      <div
        className="flex w-max items-center gap-8 animate-marquee"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {brands.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="flex items-center gap-8 whitespace-nowrap font-display text-lg font-medium text-text-secondary md:text-2xl"
          >
            {name}
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeaturedBrands() {
  return (
    <section className="bg-background py-12 md:py-16">
      <Reveal className="mx-auto flex max-w-[1280px] items-end justify-between gap-4 px-4 md:px-8">
        <h2 className="font-display text-2xl font-semibold text-text-primary md:text-4xl">
          Featured brands
        </h2>
        
      </Reveal>

      <div className="mt-10 flex flex-col gap-6">
        <MarqueeRow durationSeconds={30} />
        <MarqueeRow durationSeconds={34} />
      </div>
    </section>
  );
}
