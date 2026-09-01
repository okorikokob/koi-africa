"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  convertMinorUnits,
  formatCurrencyMinor,
  formatConvertedPrice,
  formatSourcePrice,
  normalizeDisplayCurrency,
  type DisplayCurrencyConfiguration,
  type SupportedDisplayCurrency,
} from "@/lib/display-currency";
import { toNaira } from "@/lib/currency";
import { calculatePercentageMinor, KOI_NIKE_MARGIN_BASIS_POINTS } from "@/lib/nike-pricing";

type DisplayCurrencyContextValue = {
  featureEnabled: boolean;
  conversionAvailable: boolean;
  selectedCurrency: SupportedDisplayCurrency;
  setSelectedCurrency: (currency: SupportedDisplayCurrency) => void;
  formatPrice: (amount: number, sourceCurrency: string) => string | null;
  formatSourcePrice: (amount: number, sourceCurrency: string) => string | null;
  formatMinorPrice: (amountMinor: number, sourceCurrency: string) => string | null;
  nikeSellingPrice: (amount: number, sourceCurrency: string) => {
    sellingMinorNgn: number;
    formatted: string;
  };
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
    formatMinorPrice: (amountMinor, sourceCurrency) => {
      if (!configuration.snapshot) return null;
      const converted = convertMinorUnits(amountMinor, sourceCurrency, selectedCurrency, configuration.snapshot);
      return converted === null ? null : formatCurrencyMinor(converted, selectedCurrency);
    },
    nikeSellingPrice: (amount, sourceCurrency) => {
      const sourceMinor = Math.round(amount * 100);
      const convertedAcquisition = configuration.snapshot
        ? convertMinorUnits(sourceMinor, sourceCurrency, "NGN", configuration.snapshot)
        : null;
      const acquisitionMinor = convertedAcquisition ?? Math.round(toNaira(amount, sourceCurrency) * 100);
      const sellingMinorNgn = acquisitionMinor
        + calculatePercentageMinor(acquisitionMinor, KOI_NIKE_MARGIN_BASIS_POINTS);
      const selectedMinor = configuration.snapshot
        ? convertMinorUnits(sellingMinorNgn, "NGN", selectedCurrency, configuration.snapshot)
        : null;
      return {
        sellingMinorNgn,
        formatted: selectedMinor === null
          ? formatCurrencyMinor(sellingMinorNgn, "NGN")
          : formatCurrencyMinor(selectedMinor, selectedCurrency),
      };
    },
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
