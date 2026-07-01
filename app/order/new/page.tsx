import { ShoppingBag, ClipboardList, Package, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { OrderForm } from "@/components/order/OrderForm";

type Props = {
  searchParams: Promise<{ title?: string; vendor?: string; url?: string }>;
};

const SIDEBAR_STEPS = [
  {
    icon: ShoppingBag,
    label: "Submit your order details",
    desc: "Tell us what you bought, where from, and how much you paid.",
  },
  {
    icon: ClipboardList,
    label: "KOI reviews and quotes a delivery fee",
    desc: "We calculate the shipping cost based on item size and source country.",
  },
  {
    icon: Package,
    label: "Pay the fee in naira, we deliver",
    desc: "Pay once via Paystack — no foreign card needed. KOI ships to your door.",
  },
];

export default async function NewOrderPage({ searchParams }: Props) {
  const { title, vendor, url } = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">

        {/* Page header */}
        <Reveal>
          <div className="mb-10 border-b border-border pb-8">
            <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">
              Submit your order
            </h1>
            <p className="mt-2 font-sans text-base text-text-secondary">
              Already bought something on a brand&apos;s site? Tell us what you got
              and where to deliver it — KOI handles the rest.
            </p>
          </div>
        </Reveal>

        {/* 2-col layout: form left, sidebar right */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px]">

          {/* Form card */}
          <Reveal delay={0.1}>
            <div className="rounded-card bg-surface p-6 shadow-sm md:p-8">
              <OrderForm
                prefill={{
                  title: title,
                  vendorName: vendor,
                  vendorUrl: url,
                }}
              />
            </div>
          </Reveal>

          {/* Sticky sidebar — desktop only */}
          <Reveal delay={0.2}>
            <div className="hidden lg:block">
              <div className="sticky top-24 rounded-card bg-surface-secondary p-6">
                <h2 className="font-display text-base font-semibold text-text-primary">
                  How it works
                </h2>

                <ol className="mt-5 flex flex-col gap-5">
                  {SIDEBAR_STEPS.map((step, i) => (
                    <li key={step.label} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                        <step.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-sans text-sm font-medium text-text-primary">
                          {i + 1}. {step.label}
                        </span>
                        <span className="font-sans text-xs text-text-muted">
                          {step.desc}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 flex items-start gap-2 rounded-button bg-surface p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} />
                  <p className="font-sans text-xs text-text-secondary">
                    No hidden charges — you only pay for delivery. KOI never charges for the product itself.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </div>
  );
}
