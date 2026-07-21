"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "koi-admin-theme";

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={theme === "dark" ? "admin-dark" : ""}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}
