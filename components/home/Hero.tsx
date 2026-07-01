// components/home/Hero.tsx — REBUILT
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";

type Slide = {
  ghost: string;
  headline: [string, string];
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
};

const SLIDES: Slide[] = [
  {
    ghost: "GLOBAL",
    headline: ["Your gateway to", "global shopping."],
    subtext:
      "Browse real products from hundreds of global brands, buy on their site, then let KOI deliver it home.",
    ctaLabel: "Start Shopping",
    ctaHref: "/products",
    image: "/assets/Home-default.webp",
  },
  {
    ghost: "STYLE",
    headline: ["Style without", "borders."],
    subtext:
      "Checkout on the vendor's own site in their currency, and pay KOI one simple delivery fee in NGN.",
    ctaLabel: "Explore Brands",
    ctaHref: "/brands",
    image: "/assets/Home-default-black.webp",
  },
];

const AUTOPLAY_MS = 6000;

export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];
  const goTo = (next: number) => setIndex((next + SLIDES.length) % SLIDES.length);

  const SlideControls = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => goTo(index - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors duration-150 hover:border-primary hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-display text-sm text-text-primary">
          <span className="font-bold">0{index + 1}</span>
          <span className="text-text-muted"> / 0{SLIDES.length}</span>
        </span>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => goTo(index + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors duration-150 hover:border-primary hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {SLIDES.map((_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            aria-label={`Go to slide ${dotIndex + 1}`}
            onClick={() => goTo(dotIndex)}
            className={`h-1 rounded-full transition-all duration-300 ${
              dotIndex === index ? "w-10 bg-primary" : "w-5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const SWIPE_THRESHOLD = 60;
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(index + 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(index - 1);
  };

  return (
    <Reveal>
      <section className="relative w-full overflow-hidden bg-background md:min-h-[90vh]">
        {/* Mobile layout — image card up top, swipeable, copy below */}
        <div className="flex flex-col gap-6 px-4 pb-10 pt-6 md:hidden">
          <div className="relative mx-auto aspect-[1919/899] w-full max-w-md">
            <div
              aria-hidden="true"
              className="absolute -inset-2 -rotate-2 rounded-modal bg-primary-soft"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 touch-pan-y overflow-hidden rounded-modal"
              >
                <Image
                  src={slide.image}
                  alt={slide.headline.join(" ")}
                  fill
                  sizes="100vw"
                  className="object-contain object-center drop-shadow-lg"
                  priority={index === 0}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="flex flex-col gap-3"
            >
              <span className="w-fit rounded-full bg-primary-soft px-4 py-1.5 font-sans text-sm font-medium text-primary">
                New In
              </span>
              <h1 className="font-display text-3xl font-bold leading-tight text-text-primary">
                {slide.headline[0]}
                <br />
                {slide.headline[1]}
              </h1>
              <p className="font-sans text-base leading-relaxed text-text-secondary">
                {slide.subtext}
              </p>
              <div className="mt-1">
                <Link
                  href={slide.ctaHref}
                  className="inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 font-display text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {SlideControls}
        </div>

        {/* Desktop layout — full-bleed overlay image with copy on top */}
        <div className="hidden md:block">
          {/* Decorative diagonal KOI blue shape behind image */}
          <div
            aria-hidden="true"
            className="absolute -bottom-16 right-[5%] h-[110%] w-[55%] rotate-[14deg] rounded-3xl bg-primary opacity-10"
          />

          {/* Product image */}
          <div className="absolute -top-14 -bottom-24 right-0 w-[92%]">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 drop-shadow-2xl"
              >
                <Image
                  src={slide.image}
                  alt={slide.headline.join(" ")}
                  fill
                  sizes="92vw"
                  className="object-contain object-bottom"
                  priority={index === 0}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 top-20 z-10 px-16 mt-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex max-w-lg flex-col gap-5"
              >
                <span className="w-fit rounded-full bg-primary-soft px-4 py-1.5 font-sans text-sm font-medium text-primary">
                  New In
                </span>
                <h1 className="font-display text-5xl font-bold leading-tight text-text-primary">
                  {slide.headline[0]}
                  <br />
                  {slide.headline[1]}
                </h1>
                <p className="font-sans text-lg leading-relaxed text-text-secondary">
                  {slide.subtext}
                </p>
                <div>
                  <Link
                    href={slide.ctaHref}
                    className="inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 font-display text-base font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
                  >
                    {slide.ctaLabel}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 bottom-6 z-20 px-16">{SlideControls}</div>
        </div>
      </section>
    </Reveal>
  );
}
