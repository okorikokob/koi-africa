import { and, desc, eq } from "drizzle-orm";
import type { db } from "@/database/client";
import {
  shipmentCustomsCharges,
  shipmentItems,
  shipmentPackages,
  shipments,
  shipmentTrackingEvents,
  paymentRequests,
  shippingQuotes,
} from "@/database/schema";
import { twoStagePaymentsEnabled } from "@/lib/catalog-feature-flags";
import {
  canTransitionShipmentStatus,
  isBookableConfirmedShippingQuote,
  isChronologicalShipmentEvent,
  isConfirmedShippingQuote,
  shipmentStatusRequiresConfirmedQuote,
  shipmentStatusRequiresDeliveryPayment,
  shipmentStatusRequiresRestrictionApproval,
  type ShipmentStatus,
} from "@/lib/shipment-lifecycle";

type Database = typeof db;

function positiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer.`);
}

function nonnegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a nonnegative integer.`);
}

export class LogisticsRepository {
  constructor(private readonly database: Database) {}

  async createShipment(input: {
    publicReference: string;
    orderId?: string | null;
    provider: string;
    providerAccountReference?: string | null;
    originCountryCode: string;
    destinationCountryCode: string;
    items: Array<{
      orderItemId?: string | null;
      productId?: string | null;
      variantId?: string | null;
      sourceProductId: string;
      sourceVariantId?: string | null;
      quantity: number;
    }>;
  }): Promise<typeof shipments.$inferSelect> {
    if (input.items.length === 0) throw new Error("A shipment must contain at least one item.");
    input.items.forEach((item) => positiveInteger(item.quantity, "Shipment item quantity"));

    return this.database.transaction(async (tx) => {
      const [shipment] = await tx.insert(shipments).values({
        publicReference: input.publicReference,
        orderId: input.orderId ?? null,
        provider: input.provider,
        providerAccountReference: input.providerAccountReference ?? null,
        originCountryCode: input.originCountryCode.toUpperCase(),
        destinationCountryCode: input.destinationCountryCode.toUpperCase(),
      }).returning();
      if (!shipment) throw new Error("The shipment could not be created.");

      await tx.insert(shipmentItems).values(input.items.map((item) => ({
        shipmentId: shipment.id,
        orderItemId: item.orderItemId ?? null,
        productId: item.productId ?? null,
        variantId: item.variantId ?? null,
        sourceProductId: item.sourceProductId,
        sourceVariantId: item.sourceVariantId ?? null,
        quantity: item.quantity,
      })));
      return shipment;
    });
  }

  async recordMeasuredPackage(input: {
    shipmentId: string;
    actualWeightGrams: number;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    measuredAt: Date;
  }): Promise<typeof shipments.$inferSelect> {
    return this.recordMeasuredPackages({
      shipmentId: input.shipmentId,
      measuredAt: input.measuredAt,
      packages: [{
        pieceNumber: 1,
        actualWeightGrams: input.actualWeightGrams,
        lengthMm: input.lengthMm,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
      }],
    });
  }

  async recordMeasuredPackages(input: {
    shipmentId: string;
    measuredAt: Date;
    packages: Array<{
      pieceNumber: number;
      providerPieceId?: string | null;
      actualWeightGrams: number;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
    }>;
  }): Promise<typeof shipments.$inferSelect> {
    if (input.packages.length === 0) throw new Error("At least one measured package is required.");
    const pieceNumbers = new Set<number>();
    let totalWeightGrams = 0;
    for (const shipmentPackage of input.packages) {
      positiveInteger(shipmentPackage.pieceNumber, "Package piece number");
      positiveInteger(shipmentPackage.actualWeightGrams, "Actual weight");
      positiveInteger(shipmentPackage.lengthMm, "Length");
      positiveInteger(shipmentPackage.widthMm, "Width");
      positiveInteger(shipmentPackage.heightMm, "Height");
      if (pieceNumbers.has(shipmentPackage.pieceNumber)) throw new Error("Package piece numbers must be unique.");
      pieceNumbers.add(shipmentPackage.pieceNumber);
      totalWeightGrams += shipmentPackage.actualWeightGrams;
      if (!Number.isSafeInteger(totalWeightGrams)) throw new Error("Total package weight exceeds safe limits.");
    }

    return this.database.transaction(async (tx) => {
      const [current] = await tx.select({ id: shipments.id }).from(shipments).where(and(
        eq(shipments.id, input.shipmentId),
        eq(shipments.status, "received_at_hub"),
      )).limit(1);
      if (!current) throw new Error("Only a shipment received at the hub can be measured.");
      const [latestEvent] = await tx.select({ occurredAt: shipmentTrackingEvents.occurredAt })
        .from(shipmentTrackingEvents)
        .where(eq(shipmentTrackingEvents.shipmentId, input.shipmentId))
        .orderBy(desc(shipmentTrackingEvents.occurredAt))
        .limit(1);
      if (!isChronologicalShipmentEvent({
        occurredAt: input.measuredAt,
        latestOccurredAt: latestEvent?.occurredAt ?? null,
      })) {
        throw new Error("Physical measurements cannot predate the shipment's latest tracking event.");
      }

      await tx.insert(shipmentPackages).values(input.packages.map((shipmentPackage) => ({
        shipmentId: input.shipmentId,
        pieceNumber: shipmentPackage.pieceNumber,
        providerPieceId: shipmentPackage.providerPieceId ?? null,
        actualWeightGrams: shipmentPackage.actualWeightGrams,
        lengthMm: shipmentPackage.lengthMm,
        widthMm: shipmentPackage.widthMm,
        heightMm: shipmentPackage.heightMm,
        measurementSource: "measured" as const,
        measuredAt: input.measuredAt,
      })));

      const singlePackage = input.packages.length === 1 ? input.packages[0] : null;
      const [updated] = await tx.update(shipments).set({
        actualWeightGrams: totalWeightGrams,
        lengthMm: singlePackage?.lengthMm ?? null,
        widthMm: singlePackage?.widthMm ?? null,
        heightMm: singlePackage?.heightMm ?? null,
        measurementSource: "measured",
        measuredAt: input.measuredAt,
        status: "measured",
        updatedAt: new Date(),
      }).where(and(
        eq(shipments.id, input.shipmentId),
        eq(shipments.status, "received_at_hub"),
      )).returning();
      if (!updated) throw new Error("The measured shipment could not be updated.");

      await tx.insert(shipmentTrackingEvents).values({
        shipmentId: input.shipmentId,
        providerEventId: `koi:measured:${input.shipmentId}`,
        status: "measured",
        description: `${input.packages.length} physical package piece(s) measured at the KOI hub.`,
        occurredAt: input.measuredAt,
        providerPayload: { packageCount: input.packages.length, totalWeightGrams },
      });
      return updated;
    });
  }

  async reviewRestriction(input: {
    shipmentId: string;
    status: "eligible" | "restricted" | "manual_review";
    reason: string;
  }): Promise<typeof shipments.$inferSelect> {
    if (!input.reason.trim()) throw new Error("A restriction review reason is required.");
    const [updated] = await this.database.update(shipments).set({
      restrictionStatus: input.status,
      restrictionReason: input.reason.trim(),
      updatedAt: new Date(),
    }).where(eq(shipments.id, input.shipmentId)).returning();
    if (!updated) throw new Error("The shipment restriction review could not be recorded.");
    return updated;
  }

  async recordTrackingEvent(input: {
    shipmentId: string;
    providerEventId?: string | null;
    status: ShipmentStatus;
    providerStatus?: string | null;
    description?: string | null;
    location?: string | null;
    occurredAt: Date;
    providerPayload?: Record<string, unknown> | null;
  }): Promise<{ recorded: boolean; shipment: typeof shipments.$inferSelect }> {
    return this.database.transaction(async (tx) => {
      const [shipment] = await tx.select()
        .from(shipments)
        .where(eq(shipments.id, input.shipmentId))
        .for("update")
        .limit(1);
      if (!shipment) throw new Error("The shipment was not found.");
      if (input.providerEventId) {
        const [existingEvent] = await tx.select({ id: shipmentTrackingEvents.id })
          .from(shipmentTrackingEvents)
          .where(and(
            eq(shipmentTrackingEvents.shipmentId, input.shipmentId),
            eq(shipmentTrackingEvents.providerEventId, input.providerEventId),
          ))
          .limit(1);
        if (existingEvent) return { recorded: false, shipment };
      }
      if (!canTransitionShipmentStatus(shipment.status, input.status)) {
        throw new Error(`Shipment status cannot move from ${shipment.status} to ${input.status}.`);
      }
      if (shipmentStatusRequiresRestrictionApproval(input.status) && shipment.restrictionStatus !== "eligible") {
        throw new Error("The shipment cannot be booked or moved until its restriction review is eligible.");
      }
      let confirmedQuoteAt: Date | null = null;
      if (shipmentStatusRequiresConfirmedQuote(input.status)) {
        const [quote] = shipment.shippingQuoteId
          ? await tx.select({
            stage: shippingQuotes.stage,
            status: shippingQuotes.status,
            confirmedAt: shippingQuotes.confirmedAt,
            expiresAt: shippingQuotes.expiresAt,
          }).from(shippingQuotes).where(eq(shippingQuotes.id, shipment.shippingQuoteId)).limit(1)
          : [];
        const requiresBookableQuote = shipment.bookedAt === null;
        const usable = requiresBookableQuote
          ? isBookableConfirmedShippingQuote(quote ?? null, input.occurredAt)
          : isConfirmedShippingQuote(quote ?? null);
        if (!usable) {
          throw new Error("The shipment cannot be booked or moved without a linked confirmed delivery quote.");
        }
        confirmedQuoteAt = quote?.confirmedAt ?? null;
      }
      if (twoStagePaymentsEnabled() && shipmentStatusRequiresDeliveryPayment(input.status)) {
        const [deliveryPayment] = shipment.deliveryPaymentRequestId
          ? await tx.select({
            purpose: paymentRequests.purpose,
            status: paymentRequests.status,
          }).from(paymentRequests)
            .where(eq(paymentRequests.id, shipment.deliveryPaymentRequestId))
            .limit(1)
          : [];
        if (deliveryPayment?.purpose !== "delivery" || deliveryPayment.status !== "paid") {
          throw new Error("The shipment cannot be dispatched until its delivery payment is verified.");
        }
      }
      const [latestEvent] = await tx.select({ occurredAt: shipmentTrackingEvents.occurredAt })
        .from(shipmentTrackingEvents)
        .where(eq(shipmentTrackingEvents.shipmentId, input.shipmentId))
        .orderBy(desc(shipmentTrackingEvents.occurredAt))
        .limit(1);
      if (!isChronologicalShipmentEvent({
        occurredAt: input.occurredAt,
        latestOccurredAt: latestEvent?.occurredAt ?? null,
        confirmedAt: confirmedQuoteAt,
      })) {
        throw new Error("The tracking event cannot predate the shipment's latest event or confirmed quote.");
      }

      const [event] = await tx.insert(shipmentTrackingEvents).values({
        shipmentId: input.shipmentId,
        providerEventId: input.providerEventId ?? null,
        status: input.status,
        providerStatus: input.providerStatus ?? null,
        description: input.description ?? null,
        location: input.location ?? null,
        occurredAt: input.occurredAt,
        providerPayload: input.providerPayload ?? null,
      }).onConflictDoNothing().returning({ id: shipmentTrackingEvents.id });
      if (!event) return { recorded: false, shipment };

      const [updated] = await tx.update(shipments).set({
        status: input.status,
        bookedAt: input.status === "booked" ? input.occurredAt : shipment.bookedAt,
        pickedUpAt: input.status === "picked_up" ? input.occurredAt : shipment.pickedUpAt,
        deliveredAt: input.status === "delivered" ? input.occurredAt : shipment.deliveredAt,
        updatedAt: new Date(),
      }).where(and(
        eq(shipments.id, input.shipmentId),
        eq(shipments.status, shipment.status),
      )).returning();
      if (!updated) throw new Error("The shipment changed concurrently; retry the tracking event.");
      return { recorded: true, shipment: updated };
    });
  }

  async recordCustomsCharge(input: {
    shipmentId: string;
    payer: "customer" | "koi";
    authority?: string | null;
    chargeReference?: string | null;
    description: string;
    sourceCurrency: string;
    sourceAmountMinor: number;
    pricingCurrency: string;
    pricingAmountMinor: number;
    exchangeRateSnapshot?: Record<string, unknown> | null;
    incurredAt: Date;
  }): Promise<typeof shipmentCustomsCharges.$inferSelect> {
    nonnegativeInteger(input.sourceAmountMinor, "Customs source amount");
    nonnegativeInteger(input.pricingAmountMinor, "Customs pricing amount");
    const [charge] = await this.database.insert(shipmentCustomsCharges).values({
      shipmentId: input.shipmentId,
      payer: input.payer,
      authority: input.authority ?? null,
      chargeReference: input.chargeReference ?? null,
      description: input.description,
      sourceCurrency: input.sourceCurrency.toUpperCase(),
      sourceAmountMinor: input.sourceAmountMinor,
      pricingCurrency: input.pricingCurrency.toUpperCase(),
      pricingAmountMinor: input.pricingAmountMinor,
      exchangeRateSnapshot: input.exchangeRateSnapshot ?? null,
      incurredAt: input.incurredAt,
    }).returning();
    if (!charge) throw new Error("The Customs charge could not be recorded.");
    return charge;
  }
}
