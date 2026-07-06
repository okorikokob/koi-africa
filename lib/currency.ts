// Fixed conversion rate until a live FX feed is wired up (Phase 2).
export const NGN_PER_USD = 1600;

const RATES: Record<string, number> = {
  USD: NGN_PER_USD,
  GBP: NGN_PER_USD * 1.27,
  EUR: NGN_PER_USD * 1.08,
  NGN: 1,
};

// Converts a vendor-currency amount to naira using fixed approximate rates.
export function toNaira(amount: number, currency: string = "USD"): number {
  const rate = RATES[currency.toUpperCase()] ?? NGN_PER_USD;
  return Math.round(amount * rate);
}

export function formatNaira(amountInNaira: number): string {
  return `₦${Math.round(amountInNaira).toLocaleString("en-NG")}`;
}

// Convenience: format a vendor-currency price straight to a naira string.
export function formatPriceAsNaira(amount: number, currency: string = "USD"): string {
  return formatNaira(toNaira(amount, currency));
}
