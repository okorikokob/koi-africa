import type { Metadata } from "next";
import Link from "next/link";
import { CompanyBand } from "@/components/company/CompanyBand";
import { LegalSection } from "@/components/company/LegalSection";
import { LegalToc } from "@/components/company/LegalToc";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Terms & Conditions — KOI Africa",
  description: "The terms that govern shopping and payments on KOI.",
};

const TOC = [
  { href: "#lt-1", label: "1. What KOI does" },
  { href: "#lt-2", label: "2. Pricing and payment" },
  { href: "#lt-3", label: "3. Delivery" },
  { href: "#lt-4", label: "4. Order accuracy" },
  { href: "#lt-5", label: "5. Returns" },
  { href: "#lt-6", label: "6. Contact" },
];

export default function TermsPage() {
  return (
    <div>
      <CompanyBand
        watermark="§"
        statusPill="⏳ Draft — pending legal review"
        title="Terms & Conditions"
        highlight="Conditions"
        subtitle="This page is a starting template and has not been reviewed by a lawyer. Confirm it reflects KOI's actual practices before relying on it."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <div className="mx-auto grid max-w-[1180px] gap-14 md:grid-cols-[220px_1fr]">
          <LegalToc items={TOC} />
          <Reveal>
            <div className="rounded-[20px] border border-border bg-surface px-6">
              <LegalSection id="lt-1" number={1} title="What KOI does">
                <p>
                  KOI lists products from global brands. When you place an order, KOI purchases
                  the item from the brand on your behalf, arranges international shipping, and
                  delivers it to the address you provide in Nigeria.
                </p>
              </LegalSection>
              <LegalSection id="lt-2" number={2} title="Pricing and payment">
                <p>
                  All prices are shown and charged in Nigerian naira. The price you pay at
                  checkout includes the product cost, currency conversion, shipping, and KOI&apos;s
                  delivery margin. Payment is processed by Paystack, and your order is only
                  confirmed once payment is verified.
                </p>
              </LegalSection>
              <LegalSection id="lt-3" number={3} title="Delivery">
                <p>
                  Estimated delivery time is 7–14 days from payment, depending on the brand and
                  destination. Delays can occur due to customs, international shipping, or vendor
                  availability.
                </p>
              </LegalSection>
              <LegalSection id="lt-4" number={4} title="Order accuracy">
                <p>
                  Please make sure your delivery details (name, address, phone, size, colour) are
                  correct before paying — KOI purchases the exact item and size you select.
                </p>
              </LegalSection>
              <LegalSection id="lt-5" number={5} title="Returns">
                <p>
                  Our return process is being finalised — see the{" "}
                  <Link href="/returns" className="font-bold text-primary hover:underline">
                    Returns page
                  </Link>{" "}
                  for the current status.
                </p>
              </LegalSection>
              <LegalSection id="lt-6" number={6} title="Contact">
                <p>Questions about these terms can be sent to hello@koiafrica.com.</p>
              </LegalSection>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
