import Image from "next/image";
import Link from "next/link";

const COMPANY_LINKS = [
  { label: "About KOI", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "/careers" },
];

const SHOP_LINKS = [
  { label: "All Brands", href: "/brands" },
  { label: "Fashion", href: "/brands" },
  { label: "Beauty", href: "/brands" },
  { label: "Tech", href: "/brands" },
];

const HELP_LINKS = [
  { label: "Track Order", href: "/track" },
  { label: "Returns", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const CONTACT_LINKS = [
  { label: "💬 WhatsApp us", href: "https://wa.me/2340000000000" },
  { label: "✉️ hello@koiafrica.com", href: "mailto:hello@koiafrica.com" },
  { label: "📍 Maitama, Abuja", href: "#" },
];

const SOCIAL = [
  { label: "X", href: "https://twitter.com" },
  { label: "📷", href: "https://instagram.com" },
  { label: "in", href: "https://linkedin.com" },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="mb-3.5 text-[10px] font-extrabold uppercase tracking-[2px] text-white/30 md:mb-4">
        {title}
      </div>
      <nav className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-[13px] font-medium text-white/50 transition-colors duration-150 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink px-5 pb-9 pt-11 md:px-16 md:pb-11 md:pt-[72px]">
      <div className="mx-auto max-w-[1680px]">
        <div className="relative mb-2.5 h-8 w-[72px] md:h-9 md:w-[82px]">
          <Image src="/koi-logo-light.svg" alt="KOI" fill sizes="82px" className="object-contain object-left" />
        </div>
        <p className="mb-7 max-w-xs font-sans text-[13px] leading-[1.65] text-white/40 md:mb-8 md:max-w-sm">
          Your gateway to global shopping. Browse hundreds of international brands and pay in
          naira — KOI handles the buying, shipping, and delivery.
        </p>

        <div className="mb-8 grid grid-cols-2 gap-6 md:mb-0 md:grid-cols-4 md:gap-12">
          <LinkColumn title="Company" links={COMPANY_LINKS} />
          <LinkColumn title="Shop" links={SHOP_LINKS} />
          <LinkColumn title="Help" links={HELP_LINKS} />
          <LinkColumn title="Contact" links={CONTACT_LINKS} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} KOI Africa. All rights reserved.
          </span>
          <div className="flex gap-2">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-[13px] text-white/45 transition-all duration-150 hover:bg-primary hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
