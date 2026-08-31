"use client";

import { normalizeDisplayCurrency, SUPPORTED_DISPLAY_CURRENCIES } from "@/lib/display-currency";
import { useDisplayCurrency } from "@/components/currency/DisplayCurrencyProvider";

type Props = {
  showLabel?: boolean;
  className?: string;
};

export function CurrencySelector({ showLabel = false, className = "" }: Props) {
  const {
    conversionAvailable,
    selectedCurrency,
    setSelectedCurrency,
  } = useDisplayCurrency();
  if (!conversionAvailable) return null;

  return (
    <label className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="font-sans text-sm font-medium text-text-secondary">Display currency</span>
      )}
      <select
        aria-label="Display currency"
        value={selectedCurrency}
        onChange={(event) => {
          const currency = normalizeDisplayCurrency(event.target.value);
          if (currency) setSelectedCurrency(currency);
        }}
        className="h-11 rounded-button border-[1.5px] border-border bg-surface px-3 font-sans text-base font-semibold text-text-primary outline-none transition-colors duration-150 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary-soft md:h-[42px] md:text-sm"
      >
        {SUPPORTED_DISPLAY_CURRENCIES.map((currency) => (
          <option key={currency} value={currency}>{currency}</option>
        ))}
      </select>
    </label>
  );
}
