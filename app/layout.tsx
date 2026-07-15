import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { CartProvider } from "@/lib/cart-context";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "KOI — Your gateway to global shopping",
  description:
    "Browse products from global brands and let KOI handle international shipping and delivery to your door in Nigeria.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${satoshi.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background font-sans text-text-primary"
      >
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
