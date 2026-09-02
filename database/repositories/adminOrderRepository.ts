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
  shipmentItems,
  shipmentPackages,
  shipments,
  shipmentTrackingEvents,
} from "@/database/schema";
import { canTransitionOrderStatus, type OrderStatus } from "@/lib/shipping";
import {
  isLogisticsReconciliationSettled,
  reconcileLogisticsDeposit,
  settlementStatusFor,
  validateMeasuredPackages,
  type LogisticsReconciliationStatus,
  type MeasuredPackageInput,
} from "@/lib/admin-logistics";

export class AdminOrderOperationError extends Error {}

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
      actualLogisticsMinor: orders.actualLogisticsMinor,
      logisticsAdjustmentMinor: orders.logisticsAdjustmentMinor,
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
    const [shipment] = await db.select({
      id: shipments.id,
      publicReference: shipments.publicReference,
      provider: shipments.provider,
      status: shipments.status,
      actualWeightGrams: shipments.actualWeightGrams,
      measuredAt: shipments.measuredAt,
    }).from(shipments).where(eq(shipments.orderId, id)).orderBy(desc(shipments.createdAt)).limit(1);
    const packages = shipment
      ? await db.select({
          id: shipmentPackages.id,
          pieceNumber: shipmentPackages.pieceNumber,
          actualWeightGrams: shipmentPackages.actualWeightGrams,
          lengthMm: shipmentPackages.lengthMm,
          widthMm: shipmentPackages.widthMm,
          heightMm: shipmentPackages.heightMm,
          measuredAt: shipmentPackages.measuredAt,
        }).from(shipmentPackages)
          .where(eq(shipmentPackages.shipmentId, shipment.id))
          .orderBy(shipmentPackages.pieceNumber)
      : [];
    return { ...order, items, shipment: shipment ? { ...shipment, packages } : null };
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

  async recordMeasurements(
    orderId: string,
    packages: MeasuredPackageInput[],
    originCountryCode: string,
    adminUserId: string,
  ): Promise<string> {
    const validationError = validateMeasuredPackages(packages);
    if (validationError) throw new AdminOrderOperationError(validationError);
    if (!/^[A-Z]{2}$/.test(originCountryCode)) throw new AdminOrderOperationError("Shipment origin is invalid.");
    return db.transaction(async (transaction) => {
      const [order] = await transaction.select({
        id: orders.id,
        reference: orders.reference,
        status: orders.status,
        destinationCountryCode: orders.deliveryCountryCode,
        actualLogisticsMinor: orders.actualLogisticsMinor,
      }).from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
      if (!order) throw new AdminOrderOperationError("Order not found.");
      if (order.status !== "sourcing") {
        throw new AdminOrderOperationError("Move the paid order to Sourcing before recording measurements.");
      }
      if (order.actualLogisticsMinor !== null) {
        throw new AdminOrderOperationError("Measurements cannot change after logistics has been reconciled.");
      }

      const totalWeightGrams = packages.reduce((sum, item) => sum + item.actualWeightGrams, 0);
      if (!Number.isSafeInteger(totalWeightGrams)) {
        throw new AdminOrderOperationError("Total package weight is outside the supported range.");
      }
      const now = new Date();
      let [shipment] = await transaction.select({
        id: shipments.id,
        status: shipments.status,
      }).from(shipments).where(eq(shipments.orderId, orderId)).orderBy(desc(shipments.createdAt)).for("update").limit(1);

      if (!shipment) {
        [shipment] = await transaction.insert(shipments).values({
          publicReference: `SHP-${order.reference}`,
          orderId,
          provider: "dhl",
          originCountryCode,
          destinationCountryCode: order.destinationCountryCode,
          status: "received_at_hub",
        }).returning({ id: shipments.id, status: shipments.status });
        if (!shipment) throw new AdminOrderOperationError("Shipment could not be created.");

        const items = await transaction.select({
          orderItemId: orderItems.id,
          productId: orderItems.productId,
          variantId: orderItems.variantId,
          sourceProductId: orderItems.sourceProductId,
          sourceVariantId: orderItems.sourceVariantId,
          quantity: orderItems.quantity,
        }).from(orderItems).where(eq(orderItems.orderId, orderId));
        if (items.length === 0) throw new AdminOrderOperationError("The order has no items to ship.");
        await transaction.insert(shipmentItems).values(items.map((item) => ({
          shipmentId: shipment!.id,
          ...item,
        })));
      } else if (shipment.status !== "awaiting_product" && shipment.status !== "received_at_hub" && shipment.status !== "measured") {
        throw new AdminOrderOperationError("Measurements are locked after the shipment has been quoted.");
      }

      await transaction.delete(shipmentPackages).where(eq(shipmentPackages.shipmentId, shipment.id));
      await transaction.insert(shipmentPackages).values(packages.map((item, index) => ({
        shipmentId: shipment.id,
        pieceNumber: index + 1,
        ...item,
        measurementSource: "measured" as const,
        measuredAt: now,
      })));
      const singlePackage = packages.length === 1 ? packages[0] : null;
      await transaction.update(shipments).set({
        status: "measured",
        actualWeightGrams: totalWeightGrams,
        lengthMm: singlePackage?.lengthMm ?? null,
        widthMm: singlePackage?.widthMm ?? null,
        heightMm: singlePackage?.heightMm ?? null,
        measurementSource: "measured",
        measuredAt: now,
        updatedAt: now,
      }).where(eq(shipments.id, shipment.id));
      await transaction.insert(shipmentTrackingEvents).values({
        shipmentId: shipment.id,
        status: "measured",
        description: `${packages.length} physical package piece(s) measured at the KOI hub.`,
        occurredAt: now,
        providerPayload: { packageCount: packages.length, totalWeightGrams },
      });
      await transaction.insert(adminAuditLog).values({
        adminUserId,
        action: "order.logistics_measured",
        entityType: "order",
        entityId: orderId,
        changes: JSON.stringify({ shipmentId: shipment.id, packageCount: packages.length, totalWeightGrams }),
      });
      return shipment.id;
    });
  }

  async recordLogisticsAmount(orderId: string, actualLogisticsMinor: number, quoteReference: string, adminUserId: string): Promise<void> {
    if (quoteReference.trim().length < 3 || quoteReference.trim().length > 120) {
      throw new AdminOrderOperationError("Confirmed logistics quote reference is invalid.");
    }
    await db.transaction(async (transaction) => {
      const [order] = await transaction.select({
        status: orders.status,
        depositMinor: orders.logisticsDepositMinor,
        actualLogisticsMinor: orders.actualLogisticsMinor,
        reconciliationStatus: orders.logisticsReconciliationStatus,
      }).from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
      if (!order) throw new AdminOrderOperationError("Order not found.");
      if (order.status !== "sourcing") {
        throw new AdminOrderOperationError("The order must be in Sourcing before logistics reconciliation.");
      }
      if (order.actualLogisticsMinor !== null || order.reconciliationStatus !== "pending_measurement") {
        throw new AdminOrderOperationError("Logistics has already been reconciled for this order.");
      }
      const [shipment] = await transaction.select({ status: shipments.status })
        .from(shipments).where(eq(shipments.orderId, orderId)).orderBy(desc(shipments.createdAt)).limit(1);
      if (shipment?.status !== "measured") {
        throw new AdminOrderOperationError("Record physical package measurements before logistics cost.");
      }

      const reconciliation = reconcileLogisticsDeposit(actualLogisticsMinor, order.depositMinor);
      await transaction.update(orders).set({
        actualLogisticsMinor: reconciliation.actualLogisticsMinor,
        logisticsAdjustmentMinor: reconciliation.adjustmentMinor,
        logisticsReconciliationStatus: reconciliation.status,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
      await transaction.insert(adminAuditLog).values({
        adminUserId,
        action: "order.logistics_reconciled",
        entityType: "order",
        entityId: orderId,
        changes: JSON.stringify({
          depositMinor: order.depositMinor,
          actualLogisticsMinor: reconciliation.actualLogisticsMinor,
          adjustmentMinor: reconciliation.adjustmentMinor,
          status: reconciliation.status,
          customsIncluded: false,
          quoteReference: quoteReference.trim(),
        }),
      });
    });
  }

  async settleLogisticsAdjustment(orderId: string, reference: string, adminUserId: string): Promise<void> {
    if (reference.trim().length < 3 || reference.trim().length > 120) {
      throw new AdminOrderOperationError("Settlement reference is invalid.");
    }
    await db.transaction(async (transaction) => {
      const [order] = await transaction.select({
        reconciliationStatus: orders.logisticsReconciliationStatus,
      }).from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
      if (!order) throw new AdminOrderOperationError("Order not found.");
      const target = settlementStatusFor(order.reconciliationStatus as LogisticsReconciliationStatus);
      if (!target) throw new AdminOrderOperationError("This logistics adjustment is not awaiting settlement.");

      await transaction.update(orders).set({
        logisticsReconciliationStatus: target,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
      await transaction.insert(adminAuditLog).values({
        adminUserId,
        action: target === "refunded" ? "order.logistics_refund_recorded" : "order.logistics_top_up_recorded",
        entityType: "order",
        entityId: orderId,
        changes: JSON.stringify({ from: order.reconciliationStatus, to: target, settlementReference: reference.trim() }),
      });
    });
  }

  async updateStatus(orderId: string, status: OrderStatus, adminUserId: string): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const [current] = await transaction.select({
        status: orders.status,
        reconciliationStatus: orders.logisticsReconciliationStatus,
      }).from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
      if (!current) return false;
      if (current.status === status) return true;
      const logisticsSettled = isLogisticsReconciliationSettled(current.reconciliationStatus as LogisticsReconciliationStatus);
      if (!canTransitionOrderStatus(current.status, status, logisticsSettled)) {
        throw new AdminOrderOperationError("That order status transition is not allowed yet.");
      }
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
