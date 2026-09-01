import {
  convertMinorUnits,
  majorToMinor,
  type DisplayRateSnapshot,
} from "@/lib/display-currency";

export const KOI_NIKE_MARGIN_BASIS_POINTS = 1_000;
export const KOI_NIKE_LOGISTICS_DEPOSIT_MINOR = 3_000_000;
const BASIS_POINT_DENOMINATOR = BigInt(10_000);

export type NikeUnitPricing = {
  sourceCurrency: string;
  sourceUnitPriceMinor: number;
  acquisitionUnitMinor: number;
  serviceMarginUnitMinor: number;
  sellingUnitMinor: number;
  exchangeRateSnapshot: DisplayRateSnapshot;
};

export type NikeOrderPricing = {
  acquisitionSubtotalMinor: number;
  serviceMarginMinor: number;
  sellingSubtotalMinor: number;
  logisticsDepositMinor: number;
  firstPaymentTotalMinor: number;
};

function checkedNumber(value: bigint, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`${label} exceeds the supported money range.`);
  }
  return result;
}

export function calculatePercentageMinor(amountMinor: number, basisPoints: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Money must be a nonnegative integer in minor units.");
  }
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error("Margin basis points are invalid.");
  }
  const numerator = BigInt(amountMinor) * BigInt(basisPoints);
  return checkedNumber(
    (numerator + BASIS_POINT_DENOMINATOR / BigInt(2)) / BASIS_POINT_DENOMINATOR,
    "Calculated margin",
  );
}

export function calculateNikeUnitPricing(input: {
  sourcePrice: number;
  sourceCurrency: string;
  exchangeRateSnapshot: DisplayRateSnapshot;
}): NikeUnitPricing {
  const sourceCurrency = input.sourceCurrency.trim().toUpperCase();
  const sourceUnitPriceMinor = majorToMinor(input.sourcePrice);
  if (sourceUnitPriceMinor === null || sourceUnitPriceMinor <= 0) {
    throw new Error("Nike authoritative source price is invalid.");
  }
  const acquisitionUnitMinor = convertMinorUnits(
    sourceUnitPriceMinor,
    sourceCurrency,
    "NGN",
    input.exchangeRateSnapshot,
  );
  if (acquisitionUnitMinor === null || acquisitionUnitMinor <= 0) {
    throw new Error("Nike authoritative source price could not be converted to NGN.");
  }
  const serviceMarginUnitMinor = calculatePercentageMinor(
    acquisitionUnitMinor,
    KOI_NIKE_MARGIN_BASIS_POINTS,
  );
  const sellingUnitMinor = acquisitionUnitMinor + serviceMarginUnitMinor;
  if (!Number.isSafeInteger(sellingUnitMinor)) {
    throw new Error("Nike selling price exceeds the supported money range.");
  }
  return {
    sourceCurrency,
    sourceUnitPriceMinor,
    acquisitionUnitMinor,
    serviceMarginUnitMinor,
    sellingUnitMinor,
    exchangeRateSnapshot: input.exchangeRateSnapshot,
  };
}

export function calculateNikeOrderPricing(
  items: Array<Pick<NikeUnitPricing, "acquisitionUnitMinor" | "serviceMarginUnitMinor" | "sellingUnitMinor"> & { quantity: number }>,
): NikeOrderPricing {
  let acquisitionSubtotal = BigInt(0);
  let serviceMargin = BigInt(0);
  let sellingSubtotal = BigInt(0);
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Nike checkout quantity is invalid.");
    }
    acquisitionSubtotal += BigInt(item.acquisitionUnitMinor) * BigInt(item.quantity);
    serviceMargin += BigInt(item.serviceMarginUnitMinor) * BigInt(item.quantity);
    sellingSubtotal += BigInt(item.sellingUnitMinor) * BigInt(item.quantity);
  }
  if (sellingSubtotal !== acquisitionSubtotal + serviceMargin) {
    throw new Error("Nike selling subtotal does not match acquisition cost plus margin.");
  }
  const firstPaymentTotal = sellingSubtotal + BigInt(KOI_NIKE_LOGISTICS_DEPOSIT_MINOR);
  return {
    acquisitionSubtotalMinor: checkedNumber(acquisitionSubtotal, "Acquisition subtotal"),
    serviceMarginMinor: checkedNumber(serviceMargin, "Service margin"),
    sellingSubtotalMinor: checkedNumber(sellingSubtotal, "Selling subtotal"),
    logisticsDepositMinor: KOI_NIKE_LOGISTICS_DEPOSIT_MINOR,
    firstPaymentTotalMinor: checkedNumber(firstPaymentTotal, "First payment total"),
  };
}

export function reconcileNikeLogistics(actualLogisticsMinor: number, depositMinor = KOI_NIKE_LOGISTICS_DEPOSIT_MINOR) {
  if (!Number.isSafeInteger(actualLogisticsMinor) || actualLogisticsMinor < 0) {
    throw new Error("Actual logistics must be a nonnegative integer in minor units.");
  }
  if (!Number.isSafeInteger(depositMinor) || depositMinor < 0) {
    throw new Error("Logistics deposit must be a nonnegative integer in minor units.");
  }
  const adjustmentMinor = actualLogisticsMinor - depositMinor;
  return {
    actualLogisticsMinor,
    adjustmentMinor,
    status: adjustmentMinor === 0
      ? "no_adjustment" as const
      : adjustmentMinor < 0
        ? "refund_due" as const
        : "top_up_due" as const,
  };
}
