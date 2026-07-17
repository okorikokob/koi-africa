import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Shield, CreditCard, Package } from "lucide-react";
import { CompanyBand } from "@/components/company/CompanyBand";
import { StatBar } from "@/components/company/StatBar";
import { MissionPanel } from "@/components/company/MissionPanel";
import { ProcessList } from "@/components/company/ProcessList";
import { CtaBanner } from "@/components/company/CtaBanner";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

export const metadata: Metadata = {
  title: "About KOI — KOI Africa",
  description:
    "KOI is Chowdeck for global brands — shop international brands, pay in naira, delivered to your door in Nigeria.",
};

const VALUES = [
  {
    icon: Shield,
    title: "Authentic sourcing",
    description:
      "Every item is purchased directly from the brand or its authorised retailer — never grey market, never counterfeit.",
  },
  {
    icon: CreditCard,
    title: "Transparent pricing",
    description:
      "One naira price at checkout covers the product, international shipping, and our fee. No surprise costs on delivery.",
  },
  {
    icon: Package,
    title: "Reliable delivery",
    description:
      "We handle customs and logistics door-to-door, with real tracking every step of the way — 7 to 14 days, guaranteed visibility.",
  },
];

const STEPS = [
  {
    title: "Browse global brands",
    description: "Discover products from Nike, Zara, Gucci, Sephora and 500+ more — all in one premium place.",
  },
  {
    title: "Add to your KOI cart",
    description: "Choose your size and colour, and add to your cart. Mix brands freely.",
  },
  {
    title: "Pay securely in naira",
    description: "Checkout via Paystack. The price includes product, shipping, and delivery fee.",
  },
  {
    title: "We deliver to your door",
    description: "KOI sources, ships, and delivers to your address in Nigeria in 7–14 days.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <CompanyBand
        watermark="KOI"
        eyebrow="🌍 About KOI"
        title="Global brands. Naira prices. Nigerian doorsteps."
        highlight="Nigerian doorsteps."
        subtitle="KOI is Chowdeck for global shopping — we bring Nike, Zara, Sephora, Gucci and hundreds of other international brands to Nigeria, without the forex cards or WhatsApp middlemen."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <StatBar
          stats={[
            { n: "500+", l: "Global Brands" },
            { n: "7–14d", l: "Delivery Time" },
            { n: "₦0", l: "Dollar Card Needed" },
            { n: "2026", l: "Founded in Abuja" },
          ]}
        />
      </div>

      <div className="px-5 pb-10 md:px-16 md:pb-16">
        <Reveal>
          <div className="mx-auto mb-8 max-w-[720px] text-center">
            <div className="mb-1.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">
              Our Mission
            </div>
            <h2 className="mb-3.5 font-display text-2xl font-black text-text-primary md:text-[38px]">
              Why KOI exists
            </h2>
            <p className="font-sans text-sm leading-[1.7] text-text-secondary md:text-base">
              Shopping from global brands in Nigeria is hard — foreign currency, no local
              delivery, unreliable agents. KOI removes all that friction: you browse real global
              products in one polished place, pay the full price in naira, and we handle the
              rest.
            </p>
          </div>
        </Reveal>
        <MissionPanel
          eyebrow="One Naira Price"
          text="You never leave KOI to pay anyone else. One naira price, one checkout, one place to track your order — from Lagos to London and back."
          highlight="One naira price, one checkout, one place to track your order"
        />
      </div>

      <div className="px-5 pb-10 md:px-16 md:pb-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-7 md:grid-cols-2 md:gap-14">
          <Reveal>
            <div className="font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">
              Our Story
            </div>
            <h2 className="mb-3.5 mt-1.5 font-display text-2xl font-black text-text-primary md:text-[38px]">
              Built for the Nigerian shopper
            </h2>
            <p className="font-sans text-sm leading-[1.7] text-text-secondary md:text-base">
              We started KOI after watching friends and family pay agents double the sticker
              price — or get scammed outright — just to own a pair of sneakers or a skincare
              routine sold everywhere else in the world. KOI is the fix: real brands, one fair
              naira price, delivered properly.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px]">
              <Image
                src="/assets/bags.jpg"
                alt="Global brands shopping"
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>

      <div className="px-5 pb-10 md:px-16 md:pb-16">
        <Reveal>
          <div className="mx-auto mb-7 max-w-[720px] text-center">
            <div className="mb-1.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">
              What We Believe
            </div>
            <h2 className="font-display text-2xl font-black text-text-primary md:text-[38px]">
              Built on trust, by design
            </h2>
          </div>
        </Reveal>
        <StaggerGrid className="mx-auto grid max-w-[1180px] grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
          {VALUES.map((v) => (
            <StaggerItem key={v.title}>
              <div className="h-full rounded-card border border-border bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1">
                <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft">
                  <v.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="mb-1.5 font-sans text-[15px] font-extrabold text-text-primary">
                  {v.title}
                </div>
                <p className="font-sans text-[13px] leading-[1.55] text-text-secondary">
                  {v.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>

      <div className="px-5 pb-10 md:px-16 md:pb-16">
        <Reveal>
          <div className="mx-auto mb-6 max-w-[820px] text-center">
            <div className="mb-1.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">
              Simple Process
            </div>
            <h2 className="font-display text-2xl font-black text-text-primary md:text-[38px]">
              How KOI works
            </h2>
          </div>
        </Reveal>
        <ProcessList steps={STEPS} />
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {["🔒 Paystack secured payments", "✅ Verified business", "📍 3 Chari Street, Maitama, Abuja"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border bg-surface px-4 py-2 font-sans text-[12.5px] font-bold text-text-secondary"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 pb-14 md:px-16 md:pb-20">
        <CtaBanner title="Ready to shop the world?" subtitle="Join the customers already skipping forex cards and shipping agents.">
          <Link
            href="/brands"
            className="rounded-[14px] bg-white px-6 py-3 font-sans text-sm font-extrabold text-primary shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5"
          >
            Explore Brands →
          </Link>
        </CtaBanner>
      </div>
    </div>
  );
}
