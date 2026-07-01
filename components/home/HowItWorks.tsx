import { Search, ExternalLink, ClipboardList, CreditCard, Package } from "lucide-react";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  {
    icon: Search,
    title: "Browse",
    description: "Discover products from global brands all in one place.",
  },
  {
    icon: ExternalLink,
    title: "Buy on brand's site",
    description: "Click through and purchase directly on the brand's website.",
  },
  {
    icon: ClipboardList,
    title: "Submit your order",
    description: "Come back to KOI and tell us what you bought.",
  },
  {
    icon: CreditCard,
    title: "Pay delivery fee",
    description: "We calculate and you pay the shipping fee in naira.",
  },
  {
    icon: Package,
    title: "We deliver",
    description: "KOI handles international shipping straight to your door.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background py-16 md:py-24">
      <Reveal className="text-center">
        <h2 className="font-display text-3xl font-bold text-text-primary md:text-5xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-sans text-base text-text-secondary">
          From discovery to your doorstep in 5 simple steps
        </p>
      </Reveal>

      <StaggerGrid className="relative mx-auto mt-16 grid max-w-[1280px] grid-cols-1 gap-12 px-4 sm:grid-cols-2 md:grid-cols-5 md:gap-0 md:px-8">
        {/* Connecting line behind the numbers, desktop only */}
        <div className="pointer-events-none absolute inset-x-8 top-8 hidden h-px bg-border md:block" />

        {STEPS.map((step, index) => (
          <StaggerItem key={step.title}>
            <div className="relative flex h-full flex-col items-center gap-4 text-center md:border-r md:border-border md:px-6 md:last:border-r-0">
              <span className="relative z-10 bg-background font-display text-5xl font-bold leading-none text-text-muted/40 md:text-6xl">
                {String(index + 1).padStart(2, "0")}
              </span>
              <step.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <p className="font-display text-base font-semibold text-text-primary">
                {step.title}
              </p>
              <p className="line-clamp-2 max-w-[200px] font-sans text-sm text-text-secondary">
                {step.description}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
