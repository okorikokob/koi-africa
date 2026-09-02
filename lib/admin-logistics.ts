export type LogisticsReconciliationStatus =
  | "pending_measurement"
  | "no_adjustment"
  | "refund_due"
  | "refunded"
  | "top_up_due"
  | "top_up_paid";

export type MeasuredPackageInput = {
  actualWeightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export function parseNairaAmountToMinor(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  try {
    const [whole, fraction = ""] = normalized.split(".");
    const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
    const result = Number(minor);
    return Number.isSafeInteger(result) ? result : null;
  } catch {
    return null;
  }
}

export function validateMeasuredPackages(packages: MeasuredPackageInput[]): string | null {
  if (packages.length === 0) return "Add at least one package.";
  if (packages.length > 10) return "A shipment cannot contain more than 10 packages in this workflow.";
  for (const [index, item] of packages.entries()) {
    const values = [item.actualWeightGrams, item.lengthMm, item.widthMm, item.heightMm];
    if (values.some((value) => !Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647)) {
      return `Package ${index + 1} requires positive whole-number measurements.`;
    }
  }
  return null;
}

export function isLogisticsReconciliationSettled(status: LogisticsReconciliationStatus): boolean {
  return status === "no_adjustment" || status === "refunded" || status === "top_up_paid";
}

export function settlementStatusFor(status: LogisticsReconciliationStatus): "refunded" | "top_up_paid" | null {
  if (status === "refund_due") return "refunded";
  if (status === "top_up_due") return "top_up_paid";
  return null;
}

export function reconcileLogisticsDeposit(actualLogisticsMinor: number, depositMinor: number) {
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
