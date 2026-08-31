export function nikePostgresReadsEnabled(
  environment?: { KOI_NIKE_POSTGRES_READS?: string },
): boolean {
  const value = environment === undefined
    ? process.env["KOI_NIKE_POSTGRES_READS"]
    : environment.KOI_NIKE_POSTGRES_READS;
  return value === "true";
}

export function multiCurrencyDisplayEnabled(
  environment?: { KOI_MULTI_CURRENCY_DISPLAY?: string },
): boolean {
  const value = environment === undefined
    ? process.env["KOI_MULTI_CURRENCY_DISPLAY"]
    : environment.KOI_MULTI_CURRENCY_DISPLAY;
  return value === "true";
}

export function dhlLogisticsFoundationEnabled(
  environment?: { KOI_DHL_LOGISTICS_FOUNDATION?: string },
): boolean {
  const value = environment === undefined
    ? process.env["KOI_DHL_LOGISTICS_FOUNDATION"]
    : environment.KOI_DHL_LOGISTICS_FOUNDATION;
  return value === "true";
}

export function twoStagePaymentsEnabled(
  environment?: { KOI_TWO_STAGE_PAYMENTS?: string },
): boolean {
  const value = environment === undefined
    ? process.env["KOI_TWO_STAGE_PAYMENTS"]
    : environment.KOI_TWO_STAGE_PAYMENTS;
  return value === "true";
}
