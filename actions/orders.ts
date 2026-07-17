"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/insforge-auth";
import { createInsforgeServer } from "@/lib/insforge-server";
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

    const insforge = createInsforgeServer();
    const { error } = await insforge.database
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      console.error("[actions/orders] updateOrderStatus", error);
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

    const insforge = createInsforgeServer();
    const { error } = await insforge.database
      .from("orders")
      .update({ internal_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      console.error("[actions/orders] updateOrderNotes", error);
      return { success: false, error: "Failed to save notes." };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/orders] updateOrderNotes", error);
    return { success: false, error: "Failed to save notes." };
  }
}
