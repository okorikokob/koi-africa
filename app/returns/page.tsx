import type { Metadata } from "next";
import Link from "next/link";
import { CompanyBand } from "@/components/company/CompanyBand";
import { ProcessList } from "@/components/company/ProcessList";
import { CtaBanner } from "@/components/company/CtaBanner";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Returns — KOI Africa",
  description: "KOI's return and refund policy.",
};

const ELIGIBLE = [
  "Item arrives damaged or defective",
  "Wrong item, size, or colour delivered",
  "Item is significantly different from its listing",
];

const NOT_ELIGIBLE = [
  "Change of mind after the item has shipped from the brand",
  "Items worn, used, or with tags removed",
  "Customs and import fees, once processed",
];

const STEPS = [
  {
    title: "Contact us within 48 hours of delivery",
    description: "Include your order reference and photos if the item arrived damaged.",
  },
  {
    title: "We review with the brand or logistics partner",
    description: "Most requests are reviewed within 2–3 business days.",
  },
  {
    title: "Refund or replacement",
    description: "Approved returns are refunded to your original payment method, or replaced where possible.",
  },
];

export default function ReturnsPage() {
  return (
    <div>
      <CompanyBand
        watermark="↩"
        eyebrow="↩️ Returns"
        title="Returns & refunds"
        highlight="refunds"
        subtitle="Because KOI sources every item from the brand on your behalf, our full return policy is being finalised alongside our logistics partners."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <div className="mx-auto max-w-[760px]">
          <Reveal>
            <div className="mb-7 rounded-2xl bg-primary-soft px-5 py-4 font-sans text-sm font-semibold text-primary-hover">
              🚧 Draft policy — the guidelines below reflect our general approach while the full
              policy is confirmed with our shipping partners.
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-success/30 bg-surface p-5">
                <div className="mb-3 flex items-center gap-2.5 font-sans text-sm font-extrabold text-text-primary">
                  <span className="text-lg">✅</span> Generally eligible
                </div>
                <ul className="flex flex-col gap-2.5">
                  {ELIGIBLE.map((item) => (
                    <li key={item} className="relative pl-4 font-sans text-[13px] leading-[1.5] text-text-secondary">
                      <span className="absolute left-0 text-text-muted">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-error/25 bg-surface p-5">
                <div className="mb-3 flex items-center gap-2.5 font-sans text-sm font-extrabold text-text-primary">
                  <span className="text-lg">🚫</span> Not eligible
                </div>
                <ul className="flex flex-col gap-2.5">
                  {NOT_ELIGIBLE.map((item) => (
                    <li key={item} className="relative pl-4 font-sans text-[13px] leading-[1.5] text-text-secondary">
                      <span className="absolute left-0 text-text-muted">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="mb-5 text-center font-sans text-[13px] font-extrabold uppercase tracking-[0.1em] text-text-primary">
              How to request a return
            </h2>
            <ProcessList steps={STEPS} />
          </Reveal>
        </div>
      </div>

      <div className="px-5 pb-14 md:px-16 md:pb-20">
        <CtaBanner title="Item arrived damaged or wrong?" subtitle="Contact us with your order reference and we'll help you directly.">
          <Link
            href="/contact"
            className="rounded-[14px] bg-white px-6 py-3 font-sans text-sm font-extrabold text-primary shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5"
          >
            Contact us →
          </Link>
        </CtaBanner>
      </div>
    </div>
  );
}
