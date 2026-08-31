"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  formatConvertedPrice,
  formatSourcePrice,
  normalizeDisplayCurrency,
  type DisplayCurrencyConfiguration,
  type SupportedDisplayCurrency,
} from "@/lib/display-currency";

type DisplayCurrencyContextValue = {
  featureEnabled: boolean;
  conversionAvailable: boolean;
  selectedCurrency: SupportedDisplayCurrency;
  setSelectedCurrency: (currency: SupportedDisplayCurrency) => void;
  formatPrice: (amount: number, sourceCurrency: string) => string | null;
  formatSourcePrice: (amount: number, sourceCurrency: string) => string | null;
};

type Props = {
  configuration: DisplayCurrencyConfiguration;
  children: React.ReactNode;
};

const STORAGE_KEY = "koi-display-currency";
const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ configuration, children }: Props) {
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedDisplayCurrency>("NGN");
  const conversionAvailable = configuration.featureEnabled && configuration.snapshot !== null;

  useEffect(() => {
    if (!conversionAvailable) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const normalized = stored ? normalizeDisplayCurrency(stored) : null;
      if (normalized) {
        // Browser preference is intentionally restored after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedCurrency(normalized);
      }
    } catch {
      // Storage can be unavailable; NGN remains the safe first-visit default.
    }
  }, [conversionAvailable]);

  const selectCurrency = useCallback((currency: SupportedDisplayCurrency) => {
    setSelectedCurrency(currency);
    if (!conversionAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // The current selection still works when browser storage is unavailable.
    }
  }, [conversionAvailable]);

  const value = useMemo<DisplayCurrencyContextValue>(() => ({
    featureEnabled: configuration.featureEnabled,
    conversionAvailable,
    selectedCurrency,
    setSelectedCurrency: selectCurrency,
    formatPrice: (amount, sourceCurrency) => {
      if (!configuration.snapshot) return formatSourcePrice(amount, sourceCurrency);
      return formatConvertedPrice({
        amount,
        sourceCurrency,
        targetCurrency: selectedCurrency,
        snapshot: configuration.snapshot,
      });
    },
    formatSourcePrice,
  }), [configuration.featureEnabled, configuration.snapshot, conversionAvailable, selectCurrency, selectedCurrency]);

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const value = useContext(DisplayCurrencyContext);
  if (!value) throw new Error("useDisplayCurrency must be used within DisplayCurrencyProvider.");
  return value;
}
