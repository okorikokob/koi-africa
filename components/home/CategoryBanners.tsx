import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";

const BANNERS = [
  {
    label: "Women's Fashion",
    href: "/categories/fashion",
    image: "/assets/slide2.png",
    alt: "Women's Fashion",
  },
  {
    label: "Men's Sportswear",
    href: "/categories/fashion",
    image: "/assets/hero-image.avif",
    alt: "Men's Sportswear",
  },
];

export function CategoryBanners() {
  return (
    <Reveal>
      <section className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BANNERS.map((banner) => (
            <div
              key={banner.label}
              className="group relative min-h-[350px] overflow-hidden rounded-card"
            >
              <Image
                src={banner.image}
                alt={banner.alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-black/45" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <h3 className="font-display text-xl font-bold text-white md:text-2xl">
                  {banner.label}
                </h3>
                <Link
                  href={banner.href}
                  className="font-display text-sm font-medium text-white/80 underline underline-offset-4 transition-colors duration-150 hover:text-white"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
