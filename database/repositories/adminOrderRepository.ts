import { and, count, countDistinct, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/database/client";
import {
  adminAuditLog,
  brands,
  categories,
  orderItems,
  orders,
  orderStatusHistory,
  payments,
  products,
} from "@/database/schema";
import type { OrderStatus } from "@/lib/shipping";

export type AdminOrderListRow = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  deliveryCity: string;
  deliveryRegion: string;
  totalMinor: number;
  status: OrderStatus;
  createdAt: Date;
};

export class AdminOrderRepository {
  async list(filters: { status?: OrderStatus; query?: string } = {}): Promise<AdminOrderListRow[]> {
    const queryText = filters.query?.trim();
    const predicates = [
      filters.status ? eq(orders.status, filters.status) : undefined,
      queryText ? or(ilike(orders.reference, `%${queryText}%`), ilike(orders.customerEmail, `%${queryText}%`)) : undefined,
    ].filter(Boolean);
    return db.select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      deliveryCity: orders.deliveryCity,
      deliveryRegion: orders.deliveryRegion,
      totalMinor: orders.totalMinor,
      status: orders.status,
      createdAt: orders.createdAt,
    }).from(orders)
      .where(predicates.length ? and(...predicates) : undefined)
      .orderBy(desc(orders.createdAt)) as Promise<AdminOrderListRow[]>;
  }

  async getById(id: string) {
    const [order] = await db.select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      deliveryAddress: orders.deliveryAddress,
      deliveryCity: orders.deliveryCity,
      deliveryRegion: orders.deliveryRegion,
      deliveryLandmark: orders.deliveryLandmark,
      status: orders.status,
      acquisitionSubtotalMinor: orders.productSubtotalMinor,
      marginMinor: orders.serviceFeeMinor,
      logisticsDepositMinor: orders.logisticsDepositMinor,
      customsTotalMinor: orders.customsTotalMinor,
      totalMinor: orders.totalMinor,
      reconciliationStatus: orders.logisticsReconciliationStatus,
      internalNotes: orders.internalNotes,
      createdAt: orders.createdAt,
      paymentReference: payments.providerReference,
      paymentStatus: payments.status,
    }).from(orders)
      .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.provider, "paystack")))
      .where(eq(orders.id, id)).limit(1);
    if (!order) return null;
    const items = await db.select({
      id: orderItems.id,
      title: orderItems.title,
      vendorName: orderItems.vendorName,
      imageUrl: orderItems.imageUrl,
      quantity: orderItems.quantity,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      sourceVariantId: orderItems.sourceVariantId,
      sku: orderItems.sku,
      gtin: orderItems.gtin,
      selectedOptions: orderItems.selectedOptions,
      acquisitionUnitMinor: orderItems.acquisitionUnitMinor,
      marginUnitMinor: orderItems.serviceMarginUnitMinor,
      sellingUnitMinor: orderItems.sellingUnitMinor,
    }).from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  async dashboard() {
    const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recent = await db.select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      totalMinor: orders.totalMinor,
      status: orders.status,
      createdAt: orders.createdAt,
    }).from(orders).where(gte(orders.createdAt, since60)).orderBy(desc(orders.createdAt));
    const [pending] = await db.select({ value: count() }).from(orders)
      .where(inArray(orders.status, ["pending_quote", "awaiting_payment", "paid", "sourcing"]));
    const [brandCount] = await db.select({ value: countDistinct(brands.id) }).from(brands).where(eq(brands.isActive, true));
    const categoriesByRevenue = await db.select({
      name: sql<string>`coalesce(${categories.name}, 'Other')`,
      revenueMinor: sql<number>`sum(${orderItems.sellingUnitMinor} * ${orderItems.quantity})::bigint`,
    }).from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .groupBy(categories.name)
      .orderBy(desc(sql`sum(${orderItems.sellingUnitMinor} * ${orderItems.quantity})`));
    return {
      recent,
      pendingCount: pending?.value ?? 0,
      activeBrands: brandCount?.value ?? 0,
      categoriesByRevenue,
    };
  }

  async updateStatus(orderId: string, status: OrderStatus, adminUserId: string): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const [current] = await transaction.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!current) return false;
      if (current.status === status) return true;
      await transaction.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
      await transaction.insert(orderStatusHistory).values({
        orderId,
        fromStatus: current.status,
        toStatus: status,
        changedByAdminId: adminUserId,
      });
      await transaction.insert(adminAuditLog).values({
        adminUserId,
        action: "order.status_updated",
        entityType: "order",
        entityId: orderId,
        changes: JSON.stringify({ from: current.status, to: status }),
      });
      return true;
    });
  }

  async updateNotes(orderId: string, notes: string, adminUserId: string): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const [updated] = await transaction.update(orders).set({ internalNotes: notes, updatedAt: new Date() })
        .where(eq(orders.id, orderId)).returning({ id: orders.id });
      if (!updated) return false;
      await transaction.insert(adminAuditLog).values({
        adminUserId,
        action: "order.notes_updated",
        entityType: "order",
        entityId: orderId,
        changes: JSON.stringify({ length: notes.length }),
      });
      return true;
    });
  }
}

export const adminOrderRepository = new AdminOrderRepository();
