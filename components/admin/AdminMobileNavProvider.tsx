"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function AdminMobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useAdminMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useAdminMobileNav must be used within AdminMobileNavProvider");
  return ctx;
}
