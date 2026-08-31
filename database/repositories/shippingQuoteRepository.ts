import { and, eq } from "drizzle-orm";
import type { db } from "@/database/client";
import {
  shipmentPackages,
  shipments,
  shipmentTrackingEvents,
  shippingQuoteItems,
  shippingQuotePackages,
  shippingQuotes,
  shippingZones,
} from "@/database/schema";
import type {
  DeliveryCalculationResult,
  DeliveryChargeBreakdown,
} from "@/lib/delivery-quote-calculator";
import { confirmedQuoteMatchesShipment } from "@/lib/shipment-lifecycle";

type Database = typeof db;
type SuccessfulDeliveryCalculation = Extract<DeliveryCalculationResult, { ok: true }>;

export class ShippingQuoteRepository {
  constructor(private readonly database: Database) {}

  async createQuote(input: {
    publicReference: string;
    calculation: SuccessfulDeliveryCalculation;
    breakdown: DeliveryChargeBreakdown;
    destinationZoneId: string;
    destinationCountryCode: string;
    destinationRegion?: string | null;
    destinationCity?: string | null;
    customsStatus: "unknown" | "estimated" | "confirmed" | "paid" | "waived";
    shipmentId?: string | null;
    confirmedAt?: Date;
    expiresAt?: Date | null;
  }): Promise<typeof shippingQuotes.$inferSelect> {
    if (
      input.breakdown.providerCostMinor !== input.calculation.providerCostMinor
      || input.breakdown.currency !== input.calculation.currency
    ) {
      throw new Error("The delivery breakdown does not match the provider-cost calculation.");
    }
    if (input.calculation.stage === "confirmed" && !input.shipmentId) {
      throw new Error("A confirmed quote must be linked to its measured shipment.");
    }
    const measurementSource = input.calculation.stage === "confirmed"
      ? "measured"
      : input.calculation.calculationSnapshot.lines.every((line) => line.measurementSource === "measured")
        ? "measured"
        : "provider";

    return this.database.transaction(async (tx) => {
      const confirmedAt = input.calculation.stage === "confirmed"
        ? input.confirmedAt ?? new Date()
        : null;
      const [destinationZone] = await tx.select({ countryCode: shippingZones.countryCode })
        .from(shippingZones)
        .where(eq(shippingZones.id, input.destinationZoneId))
        .limit(1);
      const destinationCountryCode = input.destinationCountryCode.trim().toUpperCase();
      if (!destinationZone || destinationZone.countryCode.trim().toUpperCase() !== destinationCountryCode) {
        throw new Error("The delivery quote destination zone does not match its destination country.");
      }
      if (input.calculation.stage === "confirmed") {
        const [shipment] = await tx.select({
          id: shipments.id,
          status: shipments.status,
          provider: shipments.provider,
          destinationCountryCode: shipments.destinationCountryCode,
        })
          .from(shipments)
          .where(eq(shipments.id, input.shipmentId!))
          .limit(1);
        if (!shipment || shipment.status !== "measured") {
          throw new Error("Only a physically measured shipment can receive a confirmed quote.");
        }
        if (!confirmedQuoteMatchesShipment({
          shipmentProvider: shipment.provider,
          shipmentDestinationCountryCode: shipment.destinationCountryCode,
          quoteProvider: input.calculation.calculationSnapshot.provider,
          quoteDestinationCountryCode: destinationCountryCode,
        })) {
          throw new Error("The confirmed provider quote does not match the shipment provider and destination.");
        }
        if (input.expiresAt && input.expiresAt <= confirmedAt!) {
          throw new Error("An already expired provider quote cannot be confirmed for a shipment.");
        }
        const storedPackages = await tx.select().from(shipmentPackages)
          .where(eq(shipmentPackages.shipmentId, shipment.id));
        const snapshotPackages = input.calculation.calculationSnapshot.packages;
        const storedById = new Map(storedPackages.map((shipmentPackage) => [shipmentPackage.id, shipmentPackage]));
        const packagesMatch = storedPackages.length === snapshotPackages.length
          && snapshotPackages.every((snapshot) => {
            if (!snapshot.shipmentPackageId) return false;
            const stored = storedById.get(snapshot.shipmentPackageId);
            return stored
              && stored.pieceNumber === snapshot.pieceNumber
              && stored.providerPieceId === snapshot.providerPieceId
              && stored.actualWeightGrams === snapshot.actualWeightGrams
              && stored.lengthMm === snapshot.lengthMm
              && stored.widthMm === snapshot.widthMm
              && stored.heightMm === snapshot.heightMm
              && stored.measurementSource === "measured";
          });
        if (!packagesMatch) {
          throw new Error("The confirmed quote package snapshot does not match the shipment's physical measurements.");
        }
        if (storedPackages.some((shipmentPackage) => shipmentPackage.measuredAt > confirmedAt!)) {
          throw new Error("A confirmed quote cannot predate its physical package measurements.");
        }
      }

      const [quote] = await tx.insert(shippingQuotes).values({
        publicReference: input.publicReference,
        status: "quoted",
        stage: input.calculation.stage,
        destinationZoneId: input.destinationZoneId,
        rateCardId: input.calculation.rateCardId,
        destinationCountryCode,
        destinationRegion: input.destinationRegion ?? null,
        destinationCity: input.destinationCity ?? null,
        actualWeightGrams: input.calculation.actualWeightGrams,
        volumetricWeightGrams: input.calculation.volumetricWeightGrams,
        chargeableWeightGrams: input.calculation.chargeableWeightGrams,
        billedWeightGrams: input.calculation.billedWeightGrams,
        measurementSource,
        currency: input.breakdown.currency,
        providerCostMinor: input.breakdown.providerCostMinor,
        logisticsMarginMinor: input.breakdown.logisticsMarginMinor,
        localDeliveryMinor: input.breakdown.localDeliveryMinor,
        amountMinor: input.breakdown.deliveryTotalMinor,
        customsStatus: input.customsStatus,
        customsDutyMinor: input.breakdown.customsDutyMinor,
        calculationSnapshot: input.calculation.calculationSnapshot,
        expiresAt: input.expiresAt ?? null,
        confirmedAt,
      }).returning();
      if (!quote) throw new Error("The delivery quote could not be created.");

      if (input.calculation.stage === "estimated") {
        await tx.insert(shippingQuoteItems).values(
          input.calculation.calculationSnapshot.lines.map((line) => ({
            shippingQuoteId: quote.id,
            sourceProductId: line.sourceProductId,
            sourceVariantId: line.sourceVariantId,
            quantity: line.quantity,
            unitWeightGrams: line.unitWeightGrams,
            lengthMm: line.lengthMm,
            widthMm: line.widthMm,
            heightMm: line.heightMm,
            measurementSource: line.measurementSource,
          })),
        );
      } else {
        await tx.insert(shippingQuotePackages).values(
          input.calculation.calculationSnapshot.packages.map((shipmentPackage) => ({
            shippingQuoteId: quote.id,
            shipmentPackageId: shipmentPackage.shipmentPackageId,
            pieceNumber: shipmentPackage.pieceNumber,
            providerPieceId: shipmentPackage.providerPieceId,
            actualWeightGrams: shipmentPackage.actualWeightGrams,
            lengthMm: shipmentPackage.lengthMm,
            widthMm: shipmentPackage.widthMm,
            heightMm: shipmentPackage.heightMm,
            measurementSource: "measured" as const,
          })),
        );

        const [updatedShipment] = await tx.update(shipments).set({
          shippingQuoteId: quote.id,
          status: "quoted",
          updatedAt: new Date(),
        }).where(and(
          eq(shipments.id, input.shipmentId!),
          eq(shipments.status, "measured"),
        )).returning({ id: shipments.id });
        if (!updatedShipment) throw new Error("The confirmed quote could not be attached to the measured shipment.");

        await tx.insert(shipmentTrackingEvents).values({
          shipmentId: input.shipmentId!,
          providerEventId: `koi:quote:${quote.id}`,
          status: "quoted",
          description: "Official provider quote linked to the measured shipment.",
          occurredAt: confirmedAt!,
          providerPayload: {
            shippingQuoteId: quote.id,
            providerQuoteReference: input.calculation.calculationSnapshot.sourceReference,
          },
        });
      }
      return quote;
    });
  }
}
