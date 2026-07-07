// Delivery fee model — initial estimate, subject to adjustment by the business
// once real shipping costs are known.
export const DELIVERY_BASE_FEE = 10000;
export const DELIVERY_PERCENTAGE = 0.05;

export function calculateDeliveryFee(subtotalNaira: number): number {
  return DELIVERY_BASE_FEE + subtotalNaira * DELIVERY_PERCENTAGE;
}
