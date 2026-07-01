"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Brands", href: "/brands" },
  { label: "Categories", href: "/categories" },
  { label: "Track Order", href: "/track" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center" aria-label="KOI home">
          <Image src="/koi-logo.svg" alt="KOI" width={88} height={50} priority />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-[13px] font-medium uppercase tracking-[0.08em] text-text-primary transition-colors duration-150 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-primary"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <span className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden="true" />
          <button
            type="button"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-primary md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="font-display text-base font-medium text-text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
