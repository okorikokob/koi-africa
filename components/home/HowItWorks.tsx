import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  {
    icon: "🔍",
    title: "Browse global brands",
    description:
      "Discover products from Nike, Zara, Gucci, Sephora and 500+ more brands — all in one premium place on KOI.",
  },
  {
    icon: "🛒",
    title: "Add to your KOI cart",
    description:
      "Select your item, choose your size and colour, and add to your cart. Browse as many brands as you like.",
  },
  {
    icon: "💳",
    title: "Pay securely in naira",
    description:
      "Checkout and pay in naira via Paystack. The price includes the product, shipping, and KOI's delivery fee. No dollar card needed.",
  },
  {
    icon: "📦",
    title: "We deliver to your door",
    description:
      "KOI sources your item from the brand, handles international shipping, and delivers straight to your address in Nigeria in 7–14 days.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-background px-5 py-10 md:mx-auto md:max-w-[1680px] md:px-16 md:py-[72px]"
    >
      <Reveal>
        <div className="mb-6 md:mb-[38px]">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[2.5px] text-primary md:text-[11px] md:tracking-[3px]">
            Simple Process
          </div>
          <div className="text-2xl font-black leading-[1.15] text-text-primary md:text-[38px] md:tracking-[-1px]">
            How KOI works
          </div>
        </div>
      </Reveal>

      <StaggerGrid className="flex flex-col md:grid md:grid-cols-2 md:gap-x-14">
        {STEPS.map((step) => (
          <StaggerItem key={step.title}>
            <div className="flex items-start gap-4 border-b border-border py-[18px] last:border-none md:py-[26px]">
              <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[13px] bg-primary-soft text-xl md:h-14 md:w-14 md:rounded-2xl md:text-2xl">
                {step.icon}
              </div>
              <div>
                <div className="mb-1 text-[15px] font-extrabold text-text-primary md:text-lg">
                  {step.title}
                </div>
                <div className="text-[13px] leading-[1.55] text-text-secondary md:text-sm">
                  {step.description}
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
