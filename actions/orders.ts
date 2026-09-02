"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminOrderOperationError, adminOrderRepository } from "@/database/repositories/adminOrderRepository";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/shipping";
import { parseNairaAmountToMinor, validateMeasuredPackages, type MeasuredPackageInput } from "@/lib/admin-logistics";

export type OrderActionState = { success: boolean; error?: string };

function operationError(error: unknown, fallback: string): string {
  return error instanceof AdminOrderOperationError ? error.message : fallback;
}

async function authorizedAdminId(): Promise<string | null> {
  const user = await getAdminUser();
  return user && user.role !== "viewer" ? user.id : null;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<OrderActionState> {
  if (!ORDER_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status." };
  }

  try {
    const user = await getAdminUser();
    if (!user) return { success: false, error: "Not authorized." };

    if (user.role === "viewer") return { success: false, error: "Not authorized." };
    const updated = await adminOrderRepository.updateStatus(orderId, status, user.id);
    if (!updated) {
      return { success: false, error: "Failed to update order status." };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] updateOrderStatus", error);
    return { success: false, error: operationError(error, "Failed to update order status.") };
  }
}

export async function recordOrderMeasurements(
  orderId: string,
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const weights = formData.getAll("actualWeightGrams").map(String);
  const lengths = formData.getAll("lengthMm").map(String);
  const widths = formData.getAll("widthMm").map(String);
  const heights = formData.getAll("heightMm").map(String);
  const originCountryCode = String(formData.get("originCountryCode") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(originCountryCode)) {
    return { success: false, error: "Enter a valid two-letter origin country code." };
  }
  if (![lengths, widths, heights].every((values) => values.length === weights.length)) {
    return { success: false, error: "Package measurement fields are incomplete." };
  }
  const packages: MeasuredPackageInput[] = weights.map((value, index) => ({
    actualWeightGrams: Number(value),
    lengthMm: Number(lengths[index]),
    widthMm: Number(widths[index]),
    heightMm: Number(heights[index]),
  }));
  const validationError = validateMeasuredPackages(packages);
  if (validationError) return { success: false, error: validationError };

  try {
    const adminUserId = await authorizedAdminId();
    if (!adminUserId) return { success: false, error: "Not authorized." };
    await adminOrderRepository.recordMeasurements(orderId, packages, originCountryCode, adminUserId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] recordOrderMeasurements", error);
    return { success: false, error: operationError(error, "Failed to record package measurements.") };
  }
}

export async function recordOrderLogisticsAmount(
  orderId: string,
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const amountMinor = parseNairaAmountToMinor(String(formData.get("actualLogisticsAmount") ?? ""));
  const quoteReference = String(formData.get("logisticsQuoteReference") ?? "").trim();
  if (amountMinor === null) {
    return { success: false, error: "Enter a valid logistics amount in naira with no more than two decimal places." };
  }
  if (quoteReference.length < 3 || quoteReference.length > 120) {
    return { success: false, error: "Enter the confirmed logistics quote reference." };
  }
  try {
    const adminUserId = await authorizedAdminId();
    if (!adminUserId) return { success: false, error: "Not authorized." };
    await adminOrderRepository.recordLogisticsAmount(orderId, amountMinor, quoteReference, adminUserId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] recordOrderLogisticsAmount", error);
    return { success: false, error: operationError(error, "Failed to reconcile logistics.") };
  }
}

export async function settleOrderLogisticsAdjustment(
  orderId: string,
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const reference = String(formData.get("settlementReference") ?? "").trim();
  if (reference.length < 3 || reference.length > 120) {
    return { success: false, error: "Enter a settlement reference between 3 and 120 characters." };
  }
  try {
    const adminUserId = await authorizedAdminId();
    if (!adminUserId) return { success: false, error: "Not authorized." };
    await adminOrderRepository.settleLogisticsAdjustment(orderId, reference, adminUserId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] settleOrderLogisticsAdjustment", error);
    return { success: false, error: operationError(error, "Failed to record logistics settlement.") };
  }
}

export async function updateOrderNotes(
  orderId: string,
  notes: string,
): Promise<OrderActionState> {
  try {
    const user = await getAdminUser();
    if (!user) return { success: false, error: "Not authorized." };

    if (user.role === "viewer") return { success: false, error: "Not authorized." };
    const updated = await adminOrderRepository.updateNotes(orderId, notes, user.id);
    if (!updated) {
      return { success: false, error: "Failed to save notes." };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] updateOrderNotes", error);
    return { success: false, error: "Failed to save notes." };
  }
}
