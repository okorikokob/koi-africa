import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login — KOI Africa",
  robots: { index: false, follow: false },
};

const BRAND_IMAGES = [
  "/assets/skirt.jpg",
  "/assets/bags.jpg",
  "/assets/Home-default-black.webp",
];

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Left — brand panel, desktop only */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-14 text-white lg:flex"
        style={{
          background:
            "linear-gradient(150deg, #000d1a 0%, #001f4d 45%, #004AAD 100%)",
        }}
      >
        <div className="absolute inset-0 grid grid-cols-3 opacity-25">
          {BRAND_IMAGES.map((src) => (
            <div key={src} className="relative h-full w-full">
              <Image src={src} alt="" fill sizes="33vw" className="object-cover object-top" />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(0,0,0,0.92) 10%, rgba(0,20,50,0.55) 55%, rgba(0,20,50,0.2) 100%)",
          }}
        />
        <div
          className="absolute -bottom-40 left-[10%] h-[500px] w-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(0,74,173,0.45) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2" aria-label="KOI home">
            <div className="relative h-8 w-[70px]">
              <Image
                src="/koi-logo.svg"
                alt="KOI"
                fill
                sizes="70px"
                className="object-contain object-left brightness-0 invert"
                priority
              />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-white/40">
              ADMIN
            </span>
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="max-w-md font-display text-4xl font-black leading-tight tracking-tight">
            Manage global commerce,{" "}
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "1.5px #5BA3FF" }}
            >
              in naira.
            </span>
          </h1>
          <p className="mt-4 max-w-sm font-sans text-[15px] leading-relaxed text-white/55">
            One console for orders, brands, payouts and customers across every
            market KOI serves.
          </p>
        </div>

        <div className="relative z-10 font-sans text-xs font-medium text-white/30">
          © 2026 KOI Africa · Internal use only
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-11 flex items-center gap-2 lg:hidden"
            aria-label="KOI home"
          >
            <div className="relative h-7 w-[62px]">
              <Image src="/koi-logo.svg" alt="KOI" fill sizes="62px" className="object-contain object-left" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-text-muted">
              ADMIN
            </span>
          </Link>

          <p className="font-sans text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            Admin console
          </p>
          <h1 className="mt-2.5 font-display text-3xl font-black tracking-tight text-text-primary">
            Welcome back
          </h1>
          <p className="mt-2.5 font-sans text-sm leading-relaxed text-text-secondary">
            Sign in to manage orders, brands, and payouts.
          </p>

          <div className="mt-9">
            <LoginForm />
          </div>

          <p className="mt-9 text-center font-sans text-xs text-text-muted">
            Need access?{" "}
            <span className="font-bold text-primary">Contact your admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
