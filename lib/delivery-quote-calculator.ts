export type DeliveryQuoteStage = "estimated" | "confirmed";
export type ShippingMeasurementSource = "provider" | "measured" | "estimated" | "unknown";

export type ShippingMeasurementRecord = {
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  measurementSource: ShippingMeasurementSource;
};

export type DeliveryQuoteLine = ShippingMeasurementRecord & {
  sourceProductId: string;
  sourceVariantId: string | null;
  quantity: number;
  measurementScope: "product" | "variant";
};

export type MeasuredShipmentPackage = ShippingMeasurementRecord & {
  shipmentPackageId?: string | null;
  pieceNumber: number;
  providerPieceId?: string | null;
};

export type ConfirmedProviderQuote = {
  provider: string;
  serviceName: string;
  currency: string;
  providerCostMinor: number;
  sourceReference: string;
  rateCardId?: string | null;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  billedWeightGrams: number;
};

export type DeliveryRateCard = {
  id: string;
  provider: string;
  serviceName: string;
  currency: string;
  minimumChargeMinor: number;
  ratePerKgMinor: number;
  minimumWeightGrams: number;
  maximumWeightGrams: number | null;
  billingIncrementGrams: number;
  volumetricDivisorCm3PerKg: string;
  sourceReference: string | null;
};

export type DeliveryCalculationFailureCode =
  | "invalid_rate_card"
  | "invalid_quantity"
  | "missing_measurements"
  | "untrusted_measurements"
  | "confirmed_measurement_required"
  | "confirmed_provider_quote_required"
  | "maximum_weight_exceeded"
  | "unsafe_calculation";

export type EstimatedDeliveryCalculationResult = {
  ok: true;
  stage: "estimated";
  currency: string;
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  billedWeightGrams: number;
  providerCostMinor: number;
  rateCardId: string;
  calculationSnapshot: {
    formulaVersion: "weight-volume-v1";
    provider: string;
    serviceName: string;
    sourceReference: string | null;
    minimumChargeMinor: number;
    ratePerKgMinor: number;
    minimumWeightGrams: number;
    maximumWeightGrams: number | null;
    billingIncrementGrams: number;
    volumetricDivisorCm3PerKg: string;
    lines: Array<{
      sourceProductId: string;
      sourceVariantId: string | null;
      quantity: number;
      measurementScope: "product" | "variant";
      measurementSource: ShippingMeasurementSource;
      unitWeightGrams: number;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
    }>;
  };
};

export type ConfirmedDeliveryCalculationResult = {
  ok: true;
  stage: "confirmed";
  currency: string;
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  billedWeightGrams: number;
  providerCostMinor: number;
  rateCardId: string | null;
  calculationSnapshot: {
    formulaVersion: "provider-confirmation-v1";
    provider: string;
    serviceName: string;
    sourceReference: string;
    packages: Array<{
      shipmentPackageId: string | null;
      pieceNumber: number;
      providerPieceId: string | null;
      measurementSource: "measured";
      actualWeightGrams: number;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
    }>;
  };
};

export type DeliveryCalculationFailure = {
  ok: false;
  code: DeliveryCalculationFailureCode;
  message: string;
  sourceProductId?: string;
  sourceVariantId?: string | null;
};

export type DeliveryCalculationResult =
  | EstimatedDeliveryCalculationResult
  | ConfirmedDeliveryCalculationResult
  | DeliveryCalculationFailure;

export type DeliveryChargeBreakdown = {
  currency: string;
  providerCostMinor: number;
  logisticsMarginMinor: number;
  localDeliveryMinor: number;
  deliveryTotalMinor: number;
  customsDutyMinor: number | null;
  customerTotalIncludingKnownCustomsMinor: number;
};

const GRAMS_PER_KILOGRAM = BigInt(1000);

function isPositiveSafeInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

function isNonnegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function completeMeasurements(record: ShippingMeasurementRecord): record is ShippingMeasurementRecord & {
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
} {
  return isPositiveSafeInteger(record.weightGrams)
    && isPositiveSafeInteger(record.lengthMm)
    && isPositiveSafeInteger(record.widthMm)
    && isPositiveSafeInteger(record.heightMm);
}

function trustedForEstimate(source: ShippingMeasurementSource): boolean {
  return source === "provider" || source === "measured";
}

export function resolveEstimatedDeliveryMeasurements(input: {
  product: ShippingMeasurementRecord;
  variant?: ShippingMeasurementRecord | null;
}): (ShippingMeasurementRecord & { measurementScope: "product" | "variant" }) | null {
  if (
    input.variant
    && completeMeasurements(input.variant)
    && trustedForEstimate(input.variant.measurementSource)
  ) {
    return { ...input.variant, measurementScope: "variant" };
  }
  if (completeMeasurements(input.product) && trustedForEstimate(input.product.measurementSource)) {
    return { ...input.product, measurementScope: "product" };
  }
  return null;
}

function positiveDecimalFraction(value: string): { numerator: bigint; denominator: bigint } | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const fraction = match[2] ?? "";
  const denominator = BigInt(10) ** BigInt(fraction.length);
  const numerator = BigInt(`${match[1] ?? "0"}${fraction}`);
  return numerator > BigInt(0) ? { numerator, denominator } : null;
}

function divideRoundedUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - BigInt(1)) / denominator;
}

function safeNumber(value: bigint): number | null {
  const converted = Number(value);
  return Number.isSafeInteger(converted) ? converted : null;
}

function invalidRateCard(rateCard: DeliveryRateCard): boolean {
  return rateCard.currency.trim().length !== 3
    || !isNonnegativeSafeInteger(rateCard.minimumChargeMinor)
    || !isNonnegativeSafeInteger(rateCard.ratePerKgMinor)
    || !isNonnegativeSafeInteger(rateCard.minimumWeightGrams)
    || (rateCard.maximumWeightGrams !== null && (
      !isPositiveSafeInteger(rateCard.maximumWeightGrams)
      || rateCard.maximumWeightGrams <= rateCard.minimumWeightGrams
    ))
    || !isPositiveSafeInteger(rateCard.billingIncrementGrams)
    || positiveDecimalFraction(rateCard.volumetricDivisorCm3PerKg) === null;
}

export function calculateEstimatedDeliveryProviderCost(input: {
  lines: DeliveryQuoteLine[];
  rateCard: DeliveryRateCard;
}): EstimatedDeliveryCalculationResult | DeliveryCalculationFailure {
  if (invalidRateCard(input.rateCard)) {
    return { ok: false, code: "invalid_rate_card", message: "The delivery rate card is invalid." };
  }
  if (input.lines.length === 0) {
    return { ok: false, code: "missing_measurements", message: "At least one measured item is required." };
  }

  let actualWeight = BigInt(0);
  let volumeMm3 = BigInt(0);
  const validatedLines: Array<DeliveryQuoteLine & {
    weightGrams: number;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
  }> = [];
  for (const line of input.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      return {
        ok: false,
        code: "invalid_quantity",
        message: "Shipment quantities must be positive integers.",
        sourceProductId: line.sourceProductId,
        sourceVariantId: line.sourceVariantId,
      };
    }
    if (!completeMeasurements(line)) {
      return {
        ok: false,
        code: "missing_measurements",
        message: "Complete weight and dimensions are required for every shipment item.",
        sourceProductId: line.sourceProductId,
        sourceVariantId: line.sourceVariantId,
      };
    }
    if (!trustedForEstimate(line.measurementSource)) {
      return {
        ok: false,
        code: "untrusted_measurements",
        message: "Estimated or unknown measurements cannot produce a delivery quote.",
        sourceProductId: line.sourceProductId,
        sourceVariantId: line.sourceVariantId,
      };
    }
    const quantity = BigInt(line.quantity);
    actualWeight += BigInt(line.weightGrams) * quantity;
    volumeMm3 += BigInt(line.lengthMm) * BigInt(line.widthMm) * BigInt(line.heightMm) * quantity;
    validatedLines.push(line);
  }

  const divisor = positiveDecimalFraction(input.rateCard.volumetricDivisorCm3PerKg);
  if (!divisor) {
    return { ok: false, code: "invalid_rate_card", message: "The volumetric divisor is invalid." };
  }
  const volumetricWeight = divideRoundedUp(volumeMm3 * divisor.denominator, divisor.numerator);
  const minimumWeight = BigInt(input.rateCard.minimumWeightGrams);
  const chargeableWeight = [actualWeight, volumetricWeight, minimumWeight]
    .reduce((highest, value) => value > highest ? value : highest, BigInt(0));
  const increment = BigInt(input.rateCard.billingIncrementGrams);
  const billedWeight = divideRoundedUp(chargeableWeight, increment) * increment;
  if (
    input.rateCard.maximumWeightGrams !== null
    && billedWeight > BigInt(input.rateCard.maximumWeightGrams)
  ) {
    return {
      ok: false,
      code: "maximum_weight_exceeded",
      message: "The shipment exceeds the selected delivery service weight limit.",
    };
  }

  const calculatedCost = divideRoundedUp(
    BigInt(input.rateCard.ratePerKgMinor) * billedWeight,
    GRAMS_PER_KILOGRAM,
  );
  const providerCost = calculatedCost > BigInt(input.rateCard.minimumChargeMinor)
    ? calculatedCost
    : BigInt(input.rateCard.minimumChargeMinor);
  const actualWeightGrams = safeNumber(actualWeight);
  const volumetricWeightGrams = safeNumber(volumetricWeight);
  const chargeableWeightGrams = safeNumber(chargeableWeight);
  const billedWeightGrams = safeNumber(billedWeight);
  const providerCostMinor = safeNumber(providerCost);
  if (
    actualWeightGrams === null
    || volumetricWeightGrams === null
    || chargeableWeightGrams === null
    || billedWeightGrams === null
    || providerCostMinor === null
  ) {
    return { ok: false, code: "unsafe_calculation", message: "The delivery calculation exceeds safe limits." };
  }

  return {
    ok: true,
    stage: "estimated",
    currency: input.rateCard.currency.toUpperCase(),
    actualWeightGrams,
    volumetricWeightGrams,
    chargeableWeightGrams,
    billedWeightGrams,
    providerCostMinor,
    rateCardId: input.rateCard.id,
    calculationSnapshot: {
      formulaVersion: "weight-volume-v1",
      provider: input.rateCard.provider,
      serviceName: input.rateCard.serviceName,
      sourceReference: input.rateCard.sourceReference,
      minimumChargeMinor: input.rateCard.minimumChargeMinor,
      ratePerKgMinor: input.rateCard.ratePerKgMinor,
      minimumWeightGrams: input.rateCard.minimumWeightGrams,
      maximumWeightGrams: input.rateCard.maximumWeightGrams,
      billingIncrementGrams: input.rateCard.billingIncrementGrams,
      volumetricDivisorCm3PerKg: input.rateCard.volumetricDivisorCm3PerKg,
      lines: validatedLines.map((line) => ({
        sourceProductId: line.sourceProductId,
        sourceVariantId: line.sourceVariantId,
        quantity: line.quantity,
        measurementScope: line.measurementScope,
        measurementSource: line.measurementSource,
        unitWeightGrams: line.weightGrams,
        lengthMm: line.lengthMm,
        widthMm: line.widthMm,
        heightMm: line.heightMm,
      })),
    },
  };
}

export function confirmDeliveryProviderCost(input: {
  packages: MeasuredShipmentPackage[];
  providerQuote: ConfirmedProviderQuote;
}): ConfirmedDeliveryCalculationResult | DeliveryCalculationFailure {
  const { providerQuote } = input;
  if (
    !providerQuote.provider.trim()
    || !providerQuote.serviceName.trim()
    || providerQuote.currency.trim().length !== 3
    || !providerQuote.sourceReference.trim()
    || !isNonnegativeSafeInteger(providerQuote.providerCostMinor)
    || !isNonnegativeSafeInteger(providerQuote.volumetricWeightGrams)
    || !isPositiveSafeInteger(providerQuote.chargeableWeightGrams)
    || !isPositiveSafeInteger(providerQuote.billedWeightGrams)
    || providerQuote.billedWeightGrams < providerQuote.chargeableWeightGrams
  ) {
    return {
      ok: false,
      code: "confirmed_provider_quote_required",
      message: "A confirmed delivery charge requires a complete official provider quote.",
    };
  }
  if (input.packages.length === 0) {
    return {
      ok: false,
      code: "missing_measurements",
      message: "At least one physically measured package is required.",
    };
  }

  const seenPieces = new Set<number>();
  let actualWeightGrams = 0;
  const packages: ConfirmedDeliveryCalculationResult["calculationSnapshot"]["packages"] = [];
  for (const shipmentPackage of input.packages) {
    if (!Number.isSafeInteger(shipmentPackage.pieceNumber) || shipmentPackage.pieceNumber <= 0) {
      return { ok: false, code: "missing_measurements", message: "Package piece numbers must be positive integers." };
    }
    if (seenPieces.has(shipmentPackage.pieceNumber)) {
      return { ok: false, code: "missing_measurements", message: "Package piece numbers must be unique." };
    }
    seenPieces.add(shipmentPackage.pieceNumber);
    if (!completeMeasurements(shipmentPackage)) {
      return { ok: false, code: "missing_measurements", message: "Every package requires complete physical measurements." };
    }
    if (shipmentPackage.measurementSource !== "measured") {
      return {
        ok: false,
        code: "confirmed_measurement_required",
        message: "A confirmed quote requires physically measured package data.",
      };
    }
    actualWeightGrams += shipmentPackage.weightGrams;
    if (!Number.isSafeInteger(actualWeightGrams)) {
      return { ok: false, code: "unsafe_calculation", message: "The package weight exceeds safe limits." };
    }
    packages.push({
      shipmentPackageId: shipmentPackage.shipmentPackageId ?? null,
      pieceNumber: shipmentPackage.pieceNumber,
      providerPieceId: shipmentPackage.providerPieceId ?? null,
      measurementSource: "measured",
      actualWeightGrams: shipmentPackage.weightGrams,
      lengthMm: shipmentPackage.lengthMm,
      widthMm: shipmentPackage.widthMm,
      heightMm: shipmentPackage.heightMm,
    });
  }

  return {
    ok: true,
    stage: "confirmed",
    currency: providerQuote.currency.toUpperCase(),
    actualWeightGrams,
    volumetricWeightGrams: providerQuote.volumetricWeightGrams,
    chargeableWeightGrams: providerQuote.chargeableWeightGrams,
    billedWeightGrams: providerQuote.billedWeightGrams,
    providerCostMinor: providerQuote.providerCostMinor,
    rateCardId: providerQuote.rateCardId ?? null,
    calculationSnapshot: {
      formulaVersion: "provider-confirmation-v1",
      provider: providerQuote.provider,
      serviceName: providerQuote.serviceName,
      sourceReference: providerQuote.sourceReference,
      packages,
    },
  };
}

export function composeDeliveryCharge(input: {
  currency: string;
  providerCostMinor: number;
  logisticsMarginMinor: number;
  localDeliveryMinor: number;
  customsDutyMinor?: number | null;
}): DeliveryChargeBreakdown | null {
  const customsDutyMinor = input.customsDutyMinor ?? null;
  if (
    input.currency.trim().length !== 3
    || !isNonnegativeSafeInteger(input.providerCostMinor)
    || !isNonnegativeSafeInteger(input.logisticsMarginMinor)
    || !isNonnegativeSafeInteger(input.localDeliveryMinor)
    || (customsDutyMinor !== null && !isNonnegativeSafeInteger(customsDutyMinor))
  ) {
    return null;
  }
  const deliveryTotalMinor = input.providerCostMinor
    + input.logisticsMarginMinor
    + input.localDeliveryMinor;
  const customerTotalIncludingKnownCustomsMinor = deliveryTotalMinor + (customsDutyMinor ?? 0);
  if (
    !Number.isSafeInteger(deliveryTotalMinor)
    || !Number.isSafeInteger(customerTotalIncludingKnownCustomsMinor)
  ) {
    return null;
  }
  return {
    currency: input.currency.toUpperCase(),
    providerCostMinor: input.providerCostMinor,
    logisticsMarginMinor: input.logisticsMarginMinor,
    localDeliveryMinor: input.localDeliveryMinor,
    deliveryTotalMinor,
    customsDutyMinor,
    customerTotalIncludingKnownCustomsMinor,
  };
}
