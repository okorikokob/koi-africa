import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/database/client";
import {
  orderItems,
  orders,
  shipmentTrackingEvents,
  shipments,
} from "@/database/schema";
import {
  normalizeCustomerEmail,
  normalizeOrderReference,
  toCustomerOrderTrackingResult,
  type CustomerOrderTrackingResult,
} from "@/lib/customer-order-tracking";

export class CustomerOrderRepository {
  async track(reference: string, email: string): Promise<CustomerOrderTrackingResult | null> {
    const normalizedReference = normalizeOrderReference(reference);
    const normalizedEmail = normalizeCustomerEmail(email);
    const [order] = await db.select({
      id: orders.id,
      reference: orders.reference,
      customerEmail: orders.customerEmail,
      status: orders.status,
      deliveryAddress: orders.deliveryAddress,
      deliveryCity: orders.deliveryCity,
      deliveryRegion: orders.deliveryRegion,
      deliveryLandmark: orders.deliveryLandmark,
      pricingCurrency: orders.pricingCurrency,
      logisticsDepositMinor: orders.logisticsDepositMinor,
      totalMinor: orders.totalMinor,
      createdAt: orders.createdAt,
    }).from(orders).where(and(
      eq(orders.reference, normalizedReference),
      sql`lower(${orders.customerEmail}) = ${normalizedEmail}`,
    )).limit(1);
    if (!order) return null;

    const items = await db.select({
      title: orderItems.title,
      brandName: orderItems.brandName,
      imageUrl: orderItems.imageUrl,
      quantity: orderItems.quantity,
      selectedOptions: orderItems.selectedOptions,
      sellingUnitMinor: orderItems.sellingUnitMinor,
      sourceVariantId: orderItems.sourceVariantId,
    }).from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(orderItems.createdAt);

    const [shipment] = await db.select({
      id: shipments.id,
      provider: shipments.provider,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
    }).from(shipments).where(eq(shipments.orderId, order.id)).orderBy(desc(shipments.createdAt)).limit(1);

    const events = shipment
      ? await db.select({
          status: shipmentTrackingEvents.status,
          location: shipmentTrackingEvents.location,
          occurredAt: shipmentTrackingEvents.occurredAt,
        }).from(shipmentTrackingEvents)
          .where(eq(shipmentTrackingEvents.shipmentId, shipment.id))
          .orderBy(shipmentTrackingEvents.occurredAt)
      : [];

    return toCustomerOrderTrackingResult({
      ...order,
      items,
      shipment: shipment ? { ...shipment, events } : null,
    });
  }
}

export const customerOrderRepository = new CustomerOrderRepository();
