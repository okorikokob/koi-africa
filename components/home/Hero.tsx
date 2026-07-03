"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const BG_IMAGES = [
  "/assets/hero-image.avif",
  "/assets/makeup.jpg",
  "/shoes/shoe-7.avif",
  "/assets/airpod.jpg",
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function scrollToHow() {
  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
}

export function Hero() {
  return (
    <section className="relative flex min-h-[72vh] flex-col justify-end overflow-hidden pt-24 md:min-h-[82vh] md:pt-32">
      {/* base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(145deg, #000d1a 0%, #001f4d 45%, var(--color-primary) 100%)",
        }}
      />

      {/* dimmed image grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 opacity-[0.28] md:grid-cols-4 md:grid-rows-1 md:opacity-[0.32]">
        {BG_IMAGES.map((src) => (
          <div key={src} className="relative h-full w-full">
            <Image src={src} alt="" fill className="object-cover object-top" />
          </div>
        ))}
      </div>

      {/* top-to-bottom darkening gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,20,0.2) 100%)",
        }}
      />

      {/* blue glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 h-[400px] w-[600px] -translate-x-1/2 bg-primary/40 blur-3xl md:left-[22%] md:h-[600px] md:w-[1000px] md:-translate-x-0 md:-bottom-48"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-[2] mx-auto w-full max-w-[1680px] px-5 pb-11 md:px-16 md:pb-[72px]"
      >
        <motion.div
          variants={item}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/25 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-accent-blue-light md:mb-6 md:px-[18px] md:text-xs"
        >
          <span className="relative flex h-[7px] w-[7px] rounded-full bg-success">
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
          </span>
          Now accepting orders
        </motion.div>

        <motion.h1
          variants={item}
          className="mb-4 text-[clamp(38px,11vw,64px)] font-black leading-[1.03] tracking-[-1px] text-white md:mb-[22px] md:text-[clamp(56px,6.2vw,88px)] md:tracking-[-2px] xl:text-[92px]"
        >
          Shop the world.
          <br />
          Pay in{" "}
          <em
            className="not-italic"
            style={{ color: "transparent", WebkitTextStroke: "2px var(--color-accent-blue)" }}
          >
            naira.
          </em>
        </motion.h1>

        <motion.p
          variants={item}
          className="mb-7 max-w-[320px] text-[15px] leading-[1.7] text-white/55 md:mb-[34px] md:max-w-[480px] md:text-lg"
        >
          Nike, Zara, Gucci, Sephora &amp; 500+ global brands delivered to your doorstep in
          Nigeria. No dollar card needed.
        </motion.p>

        <motion.div variants={item} className="mb-10 flex flex-wrap gap-3 md:mb-[52px] md:gap-4">
          <Link
            href="/brands"
            className="rounded-2xl bg-surface px-6 py-[13px] text-sm font-extrabold text-primary shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)] md:px-8 md:py-4 md:text-[15px]"
          >
            Explore Brands →
          </Link>
          <button
            type="button"
            onClick={scrollToHow}
            className="rounded-2xl border-[1.5px] border-white/25 bg-white/[0.08] px-6 py-[13px] text-sm font-semibold text-white/85 transition-all duration-200 hover:border-white/50 hover:bg-white/15 md:px-8 md:py-4 md:text-[15px]"
          >
            How it works
          </button>
        </motion.div>

        <motion.div
          variants={item}
          className="flex gap-8 border-t border-white/10 pt-6 md:gap-14 md:pt-[30px]"
        >
          <div>
            <div className="text-2xl font-black leading-none text-white md:text-[32px]">
              500+
            </div>
            <div className="mt-[3px] text-[11px] font-medium text-white/40 md:text-xs">
              Global Brands
            </div>
          </div>
          <div>
            <div className="text-2xl font-black leading-none text-white md:text-[32px]">
              7–14d
            </div>
            <div className="mt-[3px] text-[11px] font-medium text-white/40 md:text-xs">
              Delivery
            </div>
          </div>
          <div>
            <div className="text-2xl font-black leading-none text-white md:text-[32px]">₦0</div>
            <div className="mt-[3px] text-[11px] font-medium text-white/40 md:text-xs">
              Dollar card needed
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
