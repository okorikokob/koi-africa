import type { Metadata } from "next";
import Link from "next/link";
import { CompanyBand } from "@/components/company/CompanyBand";
import { CtaBanner } from "@/components/company/CtaBanner";
import { FaqAccordion, type FaqItem } from "@/components/company/FaqAccordion";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "FAQ — KOI Africa",
  description: "Answers to common questions about shopping, pricing, delivery, and payments on KOI.",
};

const FAQS: FaqItem[] = [
  {
    icon: "🛍️",
    category: "order",
    question: "How does KOI work?",
    answer:
      "You browse global brands on KOI, add items to your cart, and pay the full naira price at checkout. KOI then buys the item from the brand, ships it internationally, and delivers it to your address in Nigeria — you never pay anyone else.",
  },
  {
    icon: "💳",
    category: "pay",
    question: "Do I need a dollar card or foreign currency?",
    answer:
      "No. You pay entirely in naira via Paystack. KOI handles the currency conversion and international purchase on your behalf.",
  },
  {
    icon: "🧮",
    category: "pay",
    question: "How is the naira price calculated?",
    answer:
      "The price shown includes the product's cost, currency conversion, international shipping, and KOI's delivery fee — all in one number, with nothing added later.",
  },
  {
    icon: "🏷️",
    category: "order",
    question: "Which brands can I shop on KOI?",
    answer:
      "Global fashion, beauty, and tech brands including Nike, Zara, Sephora, Gucci, Apple, Adidas and Fenty Beauty — with more added regularly.",
  },
  {
    icon: "📏",
    category: "order",
    question: "What if the size or colour I want is sold out?",
    answer:
      "If an item goes out of stock at the brand after you order, we'll contact you immediately to offer an alternative size, colour, or a full refund.",
  },
  {
    icon: "🚚",
    category: "ship",
    question: "How long does delivery take?",
    answer:
      "Most orders arrive in 7–14 days from payment, depending on the brand and destination. Delays can occur due to customs or vendor availability.",
  },
  {
    icon: "📦",
    category: "ship",
    question: "How do I track my order?",
    answer:
      "Use the Track Order page with your order reference and checkout email to see live status updates from purchase through delivery.",
  },
  {
    icon: "⚠️",
    category: "ship",
    question: "What if my order arrives damaged or doesn't arrive?",
    answer:
      "Contact us with your order reference and photos (if damaged) and we'll investigate with our logistics partner and make it right.",
  },
  {
    icon: "🔒",
    category: "trust",
    question: "Is my payment secure?",
    answer: "Yes. All payments are processed by Paystack — KOI never sees or stores your card details.",
  },
  {
    icon: "↩️",
    category: "trust",
    question: "What's your return policy?",
    answer:
      "Items that arrive damaged, defective, or different from what you ordered are eligible for a refund or replacement. See the Returns page for full details.",
  },
  {
    icon: "💬",
    category: "trust",
    question: "How do I get help with an order?",
    answer: "Reach us on WhatsApp or email with your order reference — our team responds within a few hours.",
  },
];

export default function FaqPage() {
  return (
    <div>
      <CompanyBand
        watermark="?"
        eyebrow="❓ Support"
        title="Frequently asked questions"
        highlight="questions"
        subtitle="Everything about shopping, paying, and receiving your order on KOI."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <Reveal>
            <FaqAccordion items={FAQS} />
          </Reveal>
        </div>
      </div>

      <div className="px-5 pb-14 md:px-16 md:pb-20">
        <CtaBanner title="Still need help?" subtitle="Our team is a message away, every day of the week.">
          <Link
            href="/contact"
            className="rounded-[14px] bg-white px-6 py-3 font-sans text-sm font-extrabold text-primary shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5"
          >
            Contact us →
          </Link>
          <a
            href="https://wa.me/2340000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[14px] border border-white/25 bg-white/10 px-6 py-3 font-sans text-sm font-semibold text-white/85 transition-colors hover:bg-white/15"
          >
            💬 WhatsApp
          </a>
        </CtaBanner>
      </div>
    </div>
  );
}
