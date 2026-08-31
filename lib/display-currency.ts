export const SUPPORTED_DISPLAY_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

export type SupportedDisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

export type StoredDisplayRate = {
  rate: string;
  source: string;
  sourceReference: string | null;
  effectiveAt: string;
};

export type DisplayRateSnapshot = {
  anchorCurrency: "USD";
  rates: Record<SupportedDisplayCurrency, StoredDisplayRate>;
};

export type DisplayCurrencyConfiguration = {
  featureEnabled: boolean;
  snapshot: DisplayRateSnapshot | null;
};

const RATE_SCALE_DIGITS = 12;
const RATE_SCALE = BigInt(10) ** BigInt(RATE_SCALE_DIGITS);

export function isSupportedDisplayCurrency(value: string): value is SupportedDisplayCurrency {
  return value === "NGN" || value === "USD" || value === "GBP" || value === "EUR";
}

export function normalizeDisplayCurrency(value: string): SupportedDisplayCurrency | null {
  const normalized = value.toUpperCase();
  return isSupportedDisplayCurrency(normalized) ? normalized : null;
}

export function majorToMinor(amount: number): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function decimalToScaledInteger(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").slice(0, RATE_SCALE_DIGITS).padEnd(RATE_SCALE_DIGITS, "0");
  const scaled = BigInt(whole) * RATE_SCALE + BigInt(fraction);
  return scaled > BigInt(0) ? scaled : null;
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

export function convertMinorUnits(
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: SupportedDisplayCurrency,
  snapshot: DisplayRateSnapshot,
): number | null {
  const normalizedSource = sourceCurrency.toUpperCase();
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !isSupportedDisplayCurrency(normalizedSource)) {
    return null;
  }
  if (normalizedSource === targetCurrency) return amountMinor;

  const sourceRate = decimalToScaledInteger(snapshot.rates[normalizedSource].rate);
  const targetRate = decimalToScaledInteger(snapshot.rates[targetCurrency].rate);
  if (!sourceRate || !targetRate) return null;
  const converted = divideRounded(BigInt(amountMinor) * targetRate, sourceRate);
  const result = Number(converted);
  return Number.isSafeInteger(result) ? result : null;
}

export function formatCurrencyMinor(
  amountMinor: number,
  currency: SupportedDisplayCurrency,
): string {
  const localeByCurrency: Record<SupportedDisplayCurrency, string> = {
    NGN: "en-NG",
    USD: "en-US",
    GBP: "en-GB",
    EUR: "en-IE",
  };
  return new Intl.NumberFormat(localeByCurrency[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatSourcePrice(amount: number, currency: string): string | null {
  const normalizedCurrency = currency.toUpperCase();
  const amountMinor = majorToMinor(amount);
  if (amountMinor === null || !isSupportedDisplayCurrency(normalizedCurrency)) return null;
  return formatCurrencyMinor(amountMinor, normalizedCurrency);
}

export function formatConvertedPrice(input: {
  amount: number;
  sourceCurrency: string;
  targetCurrency: SupportedDisplayCurrency;
  snapshot: DisplayRateSnapshot;
}): string | null {
  const amountMinor = majorToMinor(input.amount);
  if (amountMinor === null) return null;
  const converted = convertMinorUnits(
    amountMinor,
    input.sourceCurrency,
    input.targetCurrency,
    input.snapshot,
  );
  return converted === null ? null : formatCurrencyMinor(converted, input.targetCurrency);
}
