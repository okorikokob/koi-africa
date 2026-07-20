"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useAdminMobileNav } from "@/components/admin/AdminMobileNavProvider";

type Props = {
  title: string;
  children?: ReactNode;
};

export function AdminTopbar({ title, children }: Props) {
  const { toggle } = useAdminMobileNav();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-4 backdrop-blur-md sm:gap-5 sm:px-6 sm:py-4.5 lg:px-9">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="-ml-1 rounded-button p-1.5 text-text-secondary hover:bg-surface-secondary lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <h1 className="font-display text-lg font-black tracking-tight text-text-primary sm:text-xl">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
