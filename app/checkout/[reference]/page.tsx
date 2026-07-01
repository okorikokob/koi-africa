import Link from "next/link";
import { CheckCircle, Clock, Package, CreditCard } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  params: Promise<{ reference: string }>;
};

const TIMELINE = [
  { icon: CheckCircle, label: "Order submitted", done: true },
  { icon: Clock, label: "KOI reviewing & setting delivery fee", done: false, active: true },
  { icon: CreditCard, label: "Pay delivery fee", done: false },
  { icon: Package, label: "KOI ships to your door", done: false },
];

export default async function CheckoutPage({ params }: Props) {
  const { reference } = await params;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-14 md:px-8 md:py-20">
        <Reveal>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-text-primary md:text-3xl">
              Order received!
            </h1>
            <p className="font-sans text-base text-text-secondary">
              Your order reference is:
            </p>
            <div className="mt-1 rounded-card border border-border bg-surface px-6 py-3">
              <span className="font-display text-xl font-bold tracking-widest text-primary">
                {reference}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs text-text-muted">
              Save this reference — you&apos;ll need it to track your order.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 rounded-card border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              What happens next
            </h2>
            <ol className="flex flex-col gap-4">
              {TIMELINE.map((step, i) => (
                <li key={step.label} className="flex items-start gap-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : step.active
                        ? "border-2 border-primary bg-primary-soft"
                        : "border border-border bg-surface-secondary"
                  }`}>
                    {step.done ? (
                      <step.icon className="h-4 w-4" />
                    ) : (
                      <span className="font-display text-xs font-bold text-text-muted">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 pt-1">
                    <span className={`font-sans text-sm font-medium ${
                      step.done
                        ? "text-text-primary"
                        : step.active
                          ? "text-primary"
                          : "text-text-muted"
                    }`}>
                      {step.label}
                    </span>
                    {step.active && (
                      <span className="font-sans text-xs text-text-muted">
                        We&apos;ll notify you via email and WhatsApp once your delivery fee is ready.
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="mt-8 rounded-card border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-1 font-display text-base font-semibold text-text-primary">
              Delivery fee
            </h2>
            <p className="font-sans text-sm text-text-secondary">
              KOI is calculating your delivery fee based on the item&apos;s weight,
              size, and source country. This usually takes 1–2 business days.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-button bg-surface-secondary px-4 py-3">
              <span className="font-sans text-sm text-text-secondary">
                Estimated delivery fee
              </span>
              <span className="font-display text-sm font-semibold text-text-muted">
                Calculating…
              </span>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-button bg-primary/40 px-6 py-3.5 font-display text-base font-medium text-primary-foreground"
            >
              Pay delivery fee
            </button>
            <p className="mt-2 text-center font-sans text-xs text-text-muted">
              Payment will be enabled once KOI sets your delivery fee.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Link
              href={`/track`}
              className="font-sans text-sm font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
            >
              Track your order →
            </Link>
            <Link
              href="/"
              className="font-sans text-sm text-text-muted transition-colors duration-150 hover:text-text-primary"
            >
              Back to home
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
