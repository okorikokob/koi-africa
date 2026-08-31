import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { LogisticsRepository } from "@/database/repositories/logisticsRepository";
import { ShippingQuoteRepository } from "@/database/repositories/shippingQuoteRepository";
import {
  shipmentPackages,
  shipments,
  shipmentTrackingEvents,
  shippingQuotePackages,
  shippingQuotes,
  shippingZones,
} from "@/database/schema";
import * as schema from "@/database/schema";
import { composeDeliveryCharge, confirmDeliveryProviderCost } from "@/lib/delivery-quote-calculator";

loadEnvConfig(process.cwd());
process.env.KOI_TWO_STAGE_PAYMENTS = "false";

async function expectRejected(
  label: string,
  action: () => Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error && error.message.includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`${label} was not rejected.`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = postgres(connectionString, { max: 2, prepare: false });
  const database = drizzle(client, { schema });
  const suffix = randomUUID();
  let shipmentId: string | null = null;
  let quoteId: string | null = null;
  let zoneId: string | null = null;

  try {
    const [zone] = await database.insert(shippingZones).values({
      name: `KOI DHL verification ${suffix}`,
      countryCode: "NG",
      isActive: false,
    }).returning();
    if (!zone) throw new Error("Verification zone could not be created.");
    zoneId = zone.id;

    const logistics = new LogisticsRepository(database);
    const quoteRepository = new ShippingQuoteRepository(database);
    const shipment = await logistics.createShipment({
      publicReference: `KOI-DHL-VERIFY-${suffix}`,
      provider: "dhl",
      originCountryCode: "US",
      destinationCountryCode: "NG",
      items: [{ sourceProductId: `verification-product-${suffix}`, quantity: 1 }],
    });
    shipmentId = shipment.id;
    const receivedAt = new Date();
    await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `koi:verification:received:${suffix}`,
      status: "received_at_hub",
      occurredAt: receivedAt,
    });
    const verificationPackages = [
      { pieceNumber: 1, actualWeightGrams: 2_000, lengthMm: 400, widthMm: 300, heightMm: 200 },
      { pieceNumber: 2, actualWeightGrams: 1_500, lengthMm: 250, widthMm: 200, heightMm: 150 },
    ];
    await expectRejected(
      "measurement chronology",
      () => logistics.recordMeasuredPackages({
        shipmentId: shipmentId!,
        measuredAt: new Date(receivedAt.getTime() - 1_000),
        packages: verificationPackages,
      }),
      "cannot predate",
    );
    await logistics.recordMeasuredPackages({
      shipmentId,
      measuredAt: new Date(receivedAt.getTime() + 1_000),
      packages: verificationPackages,
    });
    await logistics.reviewRestriction({ shipmentId, status: "eligible", reason: "Automated local verification only." });

    const storedPackages = await database.select().from(shipmentPackages)
      .where(eq(shipmentPackages.shipmentId, shipmentId))
      .orderBy(asc(shipmentPackages.pieceNumber));
    const measuredPackageInput = storedPackages.map((shipmentPackage) => ({
        shipmentPackageId: shipmentPackage.id,
        pieceNumber: shipmentPackage.pieceNumber,
        providerPieceId: shipmentPackage.providerPieceId,
        weightGrams: shipmentPackage.actualWeightGrams,
        lengthMm: shipmentPackage.lengthMm,
        widthMm: shipmentPackage.widthMm,
        heightMm: shipmentPackage.heightMm,
        measurementSource: shipmentPackage.measurementSource,
      }));
    const providerQuote = {
      provider: "dhl",
      serviceName: "Verification only",
      currency: "NGN",
      providerCostMinor: 4_250_000,
      sourceReference: `DHL-VERIFY-${suffix}`,
      volumetricWeightGrams: 6_300,
      chargeableWeightGrams: 6_300,
      billedWeightGrams: 6_500,
    };
    const calculation = confirmDeliveryProviderCost({
      packages: measuredPackageInput,
      providerQuote: {
        ...providerQuote,
      },
    });
    if (!calculation.ok) throw new Error(calculation.message);
    const breakdown = composeDeliveryCharge({
      currency: calculation.currency,
      providerCostMinor: calculation.providerCostMinor,
      logisticsMarginMinor: 0,
      localDeliveryMinor: 0,
    });
    if (!breakdown) throw new Error("Verification breakdown could not be composed.");
    const mismatchedProviderCalculation = confirmDeliveryProviderCost({
      packages: measuredPackageInput,
      providerQuote: { ...providerQuote, provider: "fedex", sourceReference: `FEDEX-VERIFY-${suffix}` },
    });
    if (!mismatchedProviderCalculation.ok) throw new Error(mismatchedProviderCalculation.message);
    await expectRejected(
      "provider identity",
      () => quoteRepository.createQuote({
        publicReference: `KOI-DHL-QUOTE-PROVIDER-MISMATCH-${suffix}`,
        calculation: mismatchedProviderCalculation,
        breakdown,
        destinationZoneId: zone.id,
        destinationCountryCode: "NG",
        customsStatus: "unknown",
        shipmentId: shipmentId!,
      }),
      "does not match the shipment provider",
    );
    await expectRejected(
      "destination identity",
      () => quoteRepository.createQuote({
        publicReference: `KOI-DHL-QUOTE-DESTINATION-MISMATCH-${suffix}`,
        calculation,
        breakdown,
        destinationZoneId: zone.id,
        destinationCountryCode: "GB",
        customsStatus: "unknown",
        shipmentId: shipmentId!,
      }),
      "destination zone does not match",
    );
    const quote = await quoteRepository.createQuote({
      publicReference: `KOI-DHL-QUOTE-VERIFY-${suffix}`,
      calculation,
      breakdown,
      destinationZoneId: zone.id,
      destinationCountryCode: "NG",
      customsStatus: "unknown",
      shipmentId,
      confirmedAt: new Date(receivedAt.getTime() + 2_000),
      expiresAt: new Date(receivedAt.getTime() + 2_500),
    });
    quoteId = quote.id;
    await expectRejected(
      "booking chronology",
      () => logistics.recordTrackingEvent({
        shipmentId: shipmentId!,
        providerEventId: `dhl:verification:early-booking:${suffix}`,
        status: "booked",
        occurredAt: new Date(receivedAt.getTime() + 1_500),
      }),
      "cannot predate",
    );
    await expectRejected(
      "expired quote booking",
      () => logistics.recordTrackingEvent({
        shipmentId: shipmentId!,
        providerEventId: `dhl:verification:expired-booking:${suffix}`,
        status: "booked",
        occurredAt: new Date(receivedAt.getTime() + 3_000),
      }),
      "without a linked confirmed delivery quote",
    );
    const booked = await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `dhl:verification:booked:${suffix}`,
      status: "booked",
      occurredAt: new Date(receivedAt.getTime() + 2_250),
    });
    await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `dhl:verification:picked-up:${suffix}`,
      status: "picked_up",
      occurredAt: new Date(receivedAt.getTime() + 4_000),
    });
    const concurrentTrackingResults = await Promise.allSettled([
      logistics.recordTrackingEvent({
        shipmentId,
        providerEventId: `dhl:verification:in-transit:${suffix}`,
        status: "in_transit",
        occurredAt: new Date(receivedAt.getTime() + 5_000),
      }),
      logistics.recordTrackingEvent({
        shipmentId,
        providerEventId: `dhl:verification:out-for-delivery:${suffix}`,
        status: "out_for_delivery",
        occurredAt: new Date(receivedAt.getTime() + 6_000),
      }),
    ]);
    const [shipmentAfterConcurrentEvents] = await database.select({ status: shipments.status })
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);
    if (
      !concurrentTrackingResults.some((result) => result.status === "fulfilled")
      || shipmentAfterConcurrentEvents?.status !== "out_for_delivery"
    ) {
      throw new Error("Concurrent tracking events did not preserve the furthest valid shipment status.");
    }
    const quotePackages = await database.select().from(shippingQuotePackages)
      .where(eq(shippingQuotePackages.shippingQuoteId, quote.id));
    const events = await database.select({ status: shipmentTrackingEvents.status })
      .from(shipmentTrackingEvents)
      .where(eq(shipmentTrackingEvents.shipmentId, shipmentId))
      .orderBy(asc(shipmentTrackingEvents.occurredAt));
    if (booked.shipment.shippingQuoteId !== quote.id || booked.shipment.status !== "booked") {
      throw new Error("The verified quote was not authoritative for booking.");
    }
    if (quotePackages.length !== 2) throw new Error("The immutable package snapshot is incomplete.");
    const statuses = events.map((event) => event.status);
    for (const expected of ["received_at_hub", "measured", "quoted", "booked", "picked_up", "out_for_delivery"] as const) {
      if (!statuses.includes(expected)) throw new Error(`The ${expected} audit event is missing.`);
    }
    console.log(JSON.stringify({
      status: "verified",
      physicalPackages: storedPackages.length,
      quotePackageSnapshots: quotePackages.length,
      trackingStatuses: statuses,
      bookingUsedLinkedConfirmedQuote: true,
      providerAndDestinationMismatchRejected: true,
      expiredQuoteBookingRejected: true,
      impossibleEventTimestampsRejected: true,
      concurrentTrackingStatus: shipmentAfterConcurrentEvents.status,
    }, null, 2));
  } finally {
    if (quoteId) await database.delete(shippingQuotes).where(eq(shippingQuotes.id, quoteId));
    if (shipmentId) await database.delete(shipments).where(eq(shipments.id, shipmentId));
    if (zoneId) await database.delete(shippingZones).where(eq(shippingZones.id, zoneId));
    await client.end();
  }
}

main().catch((error) => {
  console.error("[verify-dhl-logistics-foundation]", error);
  process.exitCode = 1;
});
