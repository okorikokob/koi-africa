import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  LayoutGrid,
  Sparkles,
  CircleUserRound,
  Banknote,
  Settings,
  Power,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Package },
];

const SOON = [
  { label: "Products", icon: LayoutGrid },
  { label: "Brands", icon: Sparkles },
  { label: "Customers", icon: CircleUserRound },
  { label: "Payouts", icon: Banknote },
];

type Props = {
  name: string;
  email: string;
};

export function AdminSidebar({ name, email }: Props) {
  const displayName = name || email.split("@")[0] || "Admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="sticky top-0 flex h-svh w-64 shrink-0 flex-col bg-ink px-4.5 py-6.5 text-white">
      <Link href="/admin" className="flex items-center gap-2 px-2.5 pb-2">
        <div className="relative h-8 w-[72px]">
          <Image src="/koi-logo-light.svg" alt="KOI" fill sizes="72px" className="object-contain object-left" />
        </div>
        <span className="font-sans text-[10px] font-bold tracking-[0.2em] text-white/35">
          ADMIN
        </span>
      </Link>
      <div className="mx-2.5 my-4.5 h-px bg-white/10" />

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 font-sans text-sm font-semibold text-white/60 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

      <p className="mb-2 mt-4.5 px-3 font-sans text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/25">
        Coming soon
      </p>
      <nav className="flex flex-col gap-0.5">
        {SOON.map(({ label, icon: Icon }) => (
          <span
            key={label}
            title="Not built yet"
            className="flex cursor-not-allowed items-center gap-3 rounded-[11px] px-3 py-2.5 font-sans text-sm font-semibold text-white/25"
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </span>
        ))}
        <span
          title="Not built yet"
          className="flex cursor-not-allowed items-center gap-3 rounded-[11px] px-3 py-2.5 font-sans text-sm font-semibold text-white/25"
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Settings
        </span>
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-sans text-sm font-extrabold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[13px] font-bold">{displayName}</p>
          <p className="truncate font-sans text-[11px] text-white/40">{email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Log out"
            className="text-white/40 transition-colors hover:text-white"
          >
            <Power className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
