import Link from "next/link";
import { LayoutDashboard, Package, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Package },
];

export function AdminSidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-border bg-surface-secondary px-4 py-6">
      <div>
        <Link href="/admin" className="block px-2 font-display text-xl font-bold text-text-primary">
          KOI Admin
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-button px-3 py-2.5 font-sans text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-text-primary"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-button px-3 py-2.5 font-sans text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Logout
        </button>
      </form>
    </aside>
  );
}
