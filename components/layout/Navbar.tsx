"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Brands", href: "/brands" },
  { label: "Categories", href: "/#categories" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  const isActive = (href: string) => href !== "/#categories" && pathname.startsWith(href);

  const goToSearch = () => {
    setIsMenuOpen(false);
    router.push("/products?focus=search");
  };

  const mobileMenu = (
    <AnimatePresence>
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 h-full w-full bg-black/40"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-y-0 right-0 flex w-[85vw] max-w-[320px] flex-col bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between bg-primary px-6 py-5">
              <span className="font-display text-lg font-semibold text-primary-foreground">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground transition-colors duration-150 hover:bg-white/15"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-6 p-6">
              <button
                type="button"
                onClick={goToSearch}
                className="flex items-center gap-3 rounded-button border border-border bg-surface-secondary px-4 py-3 font-sans text-sm text-text-muted transition-colors duration-150 hover:border-primary hover:text-primary"
              >
                <Search className="h-4 w-4" strokeWidth={1.75} />
                Search products…
              </button>

              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block rounded-button px-2 py-3 font-display text-base font-medium transition-colors duration-150 ${
                        isActive(link.href) ? "text-primary" : "text-text-primary hover:text-primary"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

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
              className={`font-display text-[13px] font-medium uppercase tracking-[0.08em] transition-colors duration-150 hover:text-primary ${
                isActive(link.href) ? "text-primary" : "text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search products"
            onClick={goToSearch}
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

      {isMounted && createPortal(mobileMenu, document.body)}
    </header>
  );
}
