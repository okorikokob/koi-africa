import type { Metadata } from "next";
import { CompanyBand } from "@/components/company/CompanyBand";
import { LegalSection } from "@/components/company/LegalSection";
import { LegalToc } from "@/components/company/LegalToc";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Privacy Policy — KOI Africa",
  description: "How KOI collects, uses, and protects your personal information.",
};

const TOC = [
  { href: "#lp-1", label: "1. Information we collect" },
  { href: "#lp-2", label: "2. How we use your information" },
  { href: "#lp-3", label: "3. How your information is stored" },
  { href: "#lp-4", label: "4. Your choices" },
  { href: "#lp-5", label: "5. Contact" },
];

export default function PrivacyPage() {
  return (
    <div>
      <CompanyBand
        watermark="🛡"
        statusPill="⏳ Draft — pending legal review"
        title="Privacy Policy"
        highlight="Policy"
        subtitle="This page is a starting template and has not been reviewed by a lawyer. Confirm it reflects KOI's actual practices before relying on it."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <div className="mx-auto grid max-w-[1180px] gap-14 md:grid-cols-[220px_1fr]">
          <LegalToc items={TOC} />
          <Reveal>
            <div className="rounded-[20px] border border-border bg-surface px-6">
              <LegalSection id="lp-1" number={1} title="Information we collect">
                <p>
                  When you place an order, we collect your name, email address, phone number, and
                  delivery address so we can fulfil and deliver your order. When you pay, Paystack
                  processes your payment details directly — KOI never sees or stores your card
                  number.
                </p>
              </LegalSection>
              <LegalSection id="lp-2" number={2} title="How we use your information">
                <p>
                  We use your information to process and deliver your order, communicate with you
                  about its status, and respond to support requests. We do not sell your personal
                  information to third parties.
                </p>
              </LegalSection>
              <LegalSection id="lp-3" number={3} title="How your information is stored">
                <p>
                  Order and account data is stored with our database provider, InsForge. Payments
                  are processed by Paystack under their own security standards.
                </p>
              </LegalSection>
              <LegalSection id="lp-4" number={4} title="Your choices">
                <p>
                  You can contact us at any time to ask what information we hold about you or to
                  request it be corrected or deleted, subject to what we&apos;re required to keep for
                  order and payment records.
                </p>
              </LegalSection>
              <LegalSection id="lp-5" number={5} title="Contact">
                <p>Questions about this policy can be sent to hello@koiafrica.com.</p>
              </LegalSection>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
