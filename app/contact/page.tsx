import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle, MapPin, ArrowRight } from "lucide-react";
import { CompanyBand } from "@/components/company/CompanyBand";
import { ContactForm } from "@/components/company/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

export const metadata: Metadata = {
  title: "Contact — KOI Africa",
  description: "Get in touch with the KOI team by email, WhatsApp, or the contact form.",
};

const ADDRESS = "3 Chari Street, Off Bobo Street, Maitama, Abuja";

const CONTACT_CARDS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@koiafrica.com",
    sub: "Replies within a few hours",
    href: "mailto:hello@koiafrica.com",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+234 000 000 0000",
    sub: "Fastest response, 9am–9pm",
    href: "https://wa.me/2340000000000",
  },
  {
    icon: MapPin,
    label: "Address",
    value: ADDRESS,
    sub: "By appointment only",
    href: undefined,
  },
];

const QUICK_LINKS = [
  { label: "Where's my order?", href: "/track" },
  { label: "How do returns work?", href: "/returns" },
  { label: "See all FAQs", href: "/faq" },
];

export default function ContactPage() {
  return (
    <div>
      <CompanyBand
        watermark="✉"
        eyebrow="💬 We're here to help"
        title="Get in touch"
        highlight="touch"
        subtitle="Questions about an order, a brand, or how KOI works? Reach us any way that works for you."
      />

      <div className="px-5 py-10 md:px-16 md:py-16">
        <StaggerGrid className="mx-auto mb-7 grid max-w-[1180px] grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
          {CONTACT_CARDS.map((card) => {
            const Icon = card.icon;
            const content = (
              <div className="flex h-full items-center gap-3.5 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary">
                <div className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
                  <Icon className="h-[19px] w-[19px] text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="font-sans text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                    {card.label}
                  </div>
                  <div className="mt-0.5 truncate font-sans text-[15px] font-extrabold text-text-primary">
                    {card.value}
                  </div>
                  <div className="mt-0.5 font-sans text-xs text-text-secondary">{card.sub}</div>
                </div>
              </div>
            );
            return (
              <StaggerItem key={card.label}>
                {card.href ? (
                  <a href={card.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </StaggerItem>
            );
          })}
        </StaggerGrid>

        <div className="mx-auto grid max-w-[1180px] items-start gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px]">
                <Image
                  src="/assets/makeup.jpg"
                  alt="KOI brand imagery"
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="overflow-hidden rounded-[20px] border border-border">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`}
                  width="100%"
                  height="220"
                  style={{ border: 0, display: "block" }}
                  loading="lazy"
                  title="KOI office location"
                />
              </div>

              <div className="rounded-[20px] border border-border bg-surface p-5">
                <div className="mb-2.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                  Office hours
                </div>
                <div className="flex justify-between border-b border-border py-2 font-sans text-[13.5px] text-text-secondary">
                  <span>Mon – Fri</span>
                  <span className="font-bold text-text-primary">9am – 6pm</span>
                </div>
                <div className="flex justify-between py-2 font-sans text-[13.5px] text-text-secondary">
                  <span>Sat – Sun</span>
                  <span className="font-bold text-text-primary">WhatsApp only</span>
                </div>
              </div>

              <div className="rounded-[20px] border border-border bg-surface p-5">
                <div className="mb-2.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                  Common questions
                </div>
                <div className="flex flex-col">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-1.5 py-1.5 font-sans text-sm font-bold text-primary hover:underline"
                    >
                      {link.label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
