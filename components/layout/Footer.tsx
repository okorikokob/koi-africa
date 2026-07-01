import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle } from "lucide-react";

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const SHOP_LINKS = [
  { label: "Brands", href: "/brands" },
  { label: "Categories", href: "/categories" },
  { label: "Track Order", href: "/track" },
];

const HELP_LINKS = [
  { label: "Returns", href: "/returns" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const SOCIAL_LINKS = [
  {
    label: "X (Twitter)",
    href: "https://twitter.com",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.26 10.99H15.96l-5.214-6.817L4.99 21.5H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231ZM16.706 19.77h1.833L7.376 4.126H5.408Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465a4.9 4.9 0 0 1 1.772 1.153 4.9 4.9 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.05 1.066.06 1.405.06 4.122s-.01 3.056-.06 4.122c-.05 1.065-.218 1.79-.465 2.428a4.9 4.9 0 0 1-1.153 1.772 4.9 4.9 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.05-1.405.06-4.122.06s-3.056-.01-4.122-.06c-1.065-.05-1.79-.218-2.428-.465a4.9 4.9 0 0 1-1.772-1.153 4.9 4.9 0 0 1-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.01 15.056 2 14.717 2 12s.01-3.056.06-4.122c.05-1.065.218-1.79.465-2.428A4.9 4.9 0 0 1 3.678 3.678 4.9 4.9 0 0 1 5.45 2.525c.637-.247 1.363-.415 2.428-.465C8.944 2.01 9.283 2 12 2Zm0 1.802c-2.67 0-2.987.01-4.04.058-.976.044-1.505.207-1.858.344a3.1 3.1 0 0 0-1.15.748 3.1 3.1 0 0 0-.748 1.15c-.137.353-.3.882-.344 1.858-.048 1.053-.058 1.37-.058 4.04s.01 2.987.058 4.04c.044.976.207 1.505.344 1.858.157.443.385.82.748 1.15.33.363.707.591 1.15.748.353.137.882.3 1.858.344 1.053.048 1.37.058 4.04.058s2.987-.01 4.04-.058c.976-.044 1.505-.207 1.858-.344a3.1 3.1 0 0 0 1.15-.748 3.1 3.1 0 0 0 .748-1.15c.137-.353.3-.882.344-1.858.048-1.053.058-1.37.058-4.04s-.01-2.987-.058-4.04c-.044-.976-.207-1.505-.344-1.858a3.1 3.1 0 0 0-.748-1.15 3.1 3.1 0 0 0-1.15-.748c-.353-.137-.882-.3-1.858-.344-1.053-.048-1.37-.058-4.04-.058Zm0 3.064a5.134 5.134 0 1 1 0 10.268A5.134 5.134 0 0 1 12 6.866Zm0 1.802a3.332 3.332 0 1 0 0 6.664 3.332 3.332 0 0 0 0-6.664Zm5.338-2.633a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z",
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M14 13.5h2.5l1-4H14V7.5c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.493-.14-2.722-.14C12.42 2 11 3.657 11 6.7V9.5H8v4h3V22h3v-8.5Z",
  },
];

function SocialIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-text-primary">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-10 px-4 py-16 md:grid-cols-4 md:px-8">
        {/* Column 1 — Brand */}
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <div className="flex h-5 items-center">
            <Image
              src="/koi-logo-light.svg"
              alt="KOI"
              width={88}
              height={50}
              className="h-5 w-auto"
            />
          </div>
          <p className="max-w-xs font-sans text-sm text-white/60">
            Your gateway to global shopping
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <a
              href="https://wa.me/2340000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-sans text-sm text-white/60 transition-colors duration-150 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </a>
            <a
              href="mailto:hello@koi.africa"
              className="flex items-center gap-2 font-sans text-sm text-white/60 transition-colors duration-150 hover:text-white"
            >
              <Mail className="h-4 w-4" />
              hello@koi.africa
            </a>
          </div>
        </div>

        {/* Column 2 — Company */}
        <div className="flex flex-col gap-4">
          <span className="font-display text-sm font-semibold text-white">Company</span>
          <nav className="flex flex-col gap-3">
            {COMPANY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-white/60 transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 3 — Shop */}
        <div className="flex flex-col gap-4">
          <span className="font-display text-sm font-semibold text-white">Shop</span>
          <nav className="flex flex-col gap-3">
            {SHOP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-white/60 transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 4 — Help */}
        <div className="flex flex-col gap-4">
          <span className="font-display text-sm font-semibold text-white">Help</span>
          <nav className="flex flex-col gap-3">
            {HELP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-white/60 transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col-reverse items-center justify-between gap-4 px-4 py-6 sm:flex-row md:px-8">
          <p className="font-sans text-xs text-white/60">
            © {new Date().getFullYear()} KOI Africa. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors duration-150 hover:text-white"
              >
                <SocialIcon path={social.path} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
