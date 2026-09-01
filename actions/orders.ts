"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { adminOrderRepository } from "@/database/repositories/adminOrderRepository";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/shipping";

export type OrderActionState = { success: boolean; error?: string };

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
    return { success: false, error: "Failed to update order status." };
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
