import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";

export function TrendingBanner() {
  return (
    <Reveal>
      <section className="relative min-h-[450px] w-full overflow-hidden bg-text-primary">
        <Image
          src="/assets/bags.jpg"
          alt="New Season Edit"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex h-full min-h-[450px] flex-col items-start justify-center gap-5 px-6 py-16 md:px-16 lg:px-24">
          <span className="font-sans text-sm font-medium text-white">
            Trending Now
          </span>
          <h2 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            New Season Edit
          </h2>
          <p className="max-w-md font-sans text-base leading-relaxed text-white md:text-lg">
            The latest drops from global brands, curated for you and delivered by KOI
          </p>
          <Link
            href="/brands"
            className="inline-flex items-center justify-center rounded-button border border-white px-6 py-3 font-display text-sm font-medium text-white transition-colors duration-150 hover:bg-white hover:text-text-primary md:text-base"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </Reveal>
  );
}
