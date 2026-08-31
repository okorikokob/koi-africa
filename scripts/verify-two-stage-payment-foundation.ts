import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { LogisticsRepository } from "@/database/repositories/logisticsRepository";
import { ShippingQuoteRepository } from "@/database/repositories/shippingQuoteRepository";
import { TwoStagePaymentRepository } from "@/database/repositories/twoStagePaymentRepository";
import {
  orders,
  paymentRequests,
  payments,
  serviceFeePolicies,
  shipmentPackages,
  shipments,
  shippingQuotes,
  shippingZones,
} from "@/database/schema";
import * as schema from "@/database/schema";
import { composeDeliveryCharge, confirmDeliveryProviderCost } from "@/lib/delivery-quote-calculator";

loadEnvConfig(process.cwd());
process.env.KOI_TWO_STAGE_PAYMENTS = "true";

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
  let orderId: string | null = null;
  let shipmentId: string | null = null;
  let quoteId: string | null = null;
  let policyId: string | null = null;
  let zoneId: string | null = null;

  try {
    const startedAt = new Date();
    const [zone] = await database.insert(shippingZones).values({
      name: `KOI two-stage verification ${suffix}`,
      countryCode: "NG",
      isActive: false,
    }).returning();
    if (!zone) throw new Error("The verification zone could not be created.");
    zoneId = zone.id;

    const [policy] = await database.insert(serviceFeePolicies).values({
      name: "Temporary verification policy — not a business approval",
      currency: "NGN",
      percentageBasisPoints: 1_500,
      minimumFeeMinor: 1_000_000,
      approvalReference: `TEST-ONLY-${suffix}`,
      effectiveFrom: new Date(startedAt.getTime() - 1_000),
      isActive: true,
    }).returning();
    if (!policy) throw new Error("The verification policy could not be created.");
    policyId = policy.id;

    const [order] = await database.insert(orders).values({
      reference: `KOI-TWO-STAGE-VERIFY-${suffix}`,
      customerName: "Verification Customer",
      customerEmail: "verification@example.com",
      customerPhone: "+2340000000000",
      deliveryAddress: "Verification only",
      deliveryCity: "Abuja",
      deliveryRegion: "FCT",
      pricingCurrency: "NGN",
      displayCurrency: "NGN",
      productSubtotalMinor: 50_000_000,
      shippingTotalMinor: 0,
      customsTotalMinor: 0,
      totalMinor: 50_000_000,
    }).returning();
    if (!order) throw new Error("The verification order could not be created.");
    orderId = order.id;

    const paymentRepository = new TwoStagePaymentRepository(database);
    const logistics = new LogisticsRepository(database);
    const quoteRepository = new ShippingQuoteRepository(database);
    await database.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
    await expectRejected(
      "cancelled order product payment request",
      () => paymentRepository.createProductAndServiceRequest({
        publicReference: `KOI-PRODUCT-PAYMENT-CANCELLED-${suffix}`,
        orderId: orderId!,
        serviceFeePolicyId: policy.id,
        effectiveAt: startedAt,
      }),
      "not eligible",
    );
    await database.update(orders).set({ status: "delivered" }).where(eq(orders.id, orderId));
    await expectRejected(
      "delivered order product payment request",
      () => paymentRepository.createProductAndServiceRequest({
        publicReference: `KOI-PRODUCT-PAYMENT-DELIVERED-${suffix}`,
        orderId: orderId!,
        serviceFeePolicyId: policy.id,
        effectiveAt: startedAt,
      }),
      "not eligible",
    );
    await database.update(orders).set({ status: "pending_quote" }).where(eq(orders.id, orderId));
    const productRequest = await paymentRepository.createProductAndServiceRequest({
      publicReference: `KOI-PRODUCT-PAYMENT-VERIFY-${suffix}`,
      orderId,
      serviceFeePolicyId: policy.id,
      effectiveAt: startedAt,
      expiresAt: new Date(startedAt.getTime() + 60 * 60 * 1_000),
    });
    if (productRequest.amountMinor !== 57_500_000) {
      throw new Error("The product and service request amount is incorrect.");
    }
    await expectRejected(
      "tampered product payment",
      () => paymentRepository.recordVerifiedPayment({
        paymentRequestId: productRequest.id,
        provider: "paystack",
        providerReference: `PAYSTACK-PRODUCT-WRONG-${suffix}`,
        currency: "NGN",
        verifiedAmountMinor: productRequest.amountMinor - 1,
        verifiedAt: new Date(startedAt.getTime() + 1_000),
      }),
      "does not match",
    );
    const productProviderReference = `PAYSTACK-PRODUCT-${suffix}`;
    const [refundedAttempt] = await database.insert(payments).values({
      orderId,
      paymentRequestId: productRequest.id,
      purpose: productRequest.purpose,
      provider: "paystack",
      providerReference: `PAYSTACK-PRODUCT-REFUNDED-${suffix}`,
      currency: productRequest.currency,
      expectedAmountMinor: productRequest.amountMinor,
      verifiedAmountMinor: productRequest.amountMinor,
      status: "refunded",
      verifiedAt: new Date(startedAt.getTime() + 1_500),
    }).returning();
    if (!refundedAttempt) throw new Error("The refunded verification attempt could not be created.");
    await expectRejected(
      "refunded provider payment reconciliation",
      () => paymentRepository.recordVerifiedPayment({
        paymentRequestId: productRequest.id,
        provider: "paystack",
        providerReference: refundedAttempt.providerReference,
        currency: "NGN",
        verifiedAmountMinor: productRequest.amountMinor,
        verifiedAt: new Date(startedAt.getTime() + 1_600),
      }),
      "cannot be reconciled",
    );
    const [pendingAttempt] = await database.insert(payments).values({
      orderId,
      paymentRequestId: productRequest.id,
      purpose: productRequest.purpose,
      provider: "paystack",
      providerReference: productProviderReference,
      currency: productRequest.currency,
      expectedAmountMinor: productRequest.amountMinor,
      status: "pending",
    }).returning();
    if (!pendingAttempt) throw new Error("The pending verification attempt could not be created.");
    const reconciledProductPayment = await paymentRepository.recordVerifiedPayment({
      paymentRequestId: productRequest.id,
      provider: "paystack",
      providerReference: productProviderReference,
      currency: "NGN",
      verifiedAmountMinor: productRequest.amountMinor,
      verifiedAt: new Date(startedAt.getTime() + 2_000),
    });
    if (reconciledProductPayment.id !== pendingAttempt.id || reconciledProductPayment.status !== "success") {
      throw new Error("The pending product payment was not reconciled in place.");
    }
    const replayedProductPayment = await paymentRepository.recordVerifiedPayment({
      paymentRequestId: productRequest.id,
      provider: "paystack",
      providerReference: productProviderReference,
      currency: "NGN",
      verifiedAmountMinor: productRequest.amountMinor,
      verifiedAt: new Date(startedAt.getTime() + 2_000),
    });
    if (replayedProductPayment.id !== pendingAttempt.id) {
      throw new Error("The successful product payment replay was not idempotent.");
    }

    const shipment = await logistics.createShipment({
      publicReference: `KOI-SHIPMENT-TWO-STAGE-${suffix}`,
      orderId,
      provider: "dhl",
      originCountryCode: "US",
      destinationCountryCode: "NG",
      items: [{ sourceProductId: `verification-product-${suffix}`, quantity: 1 }],
    });
    shipmentId = shipment.id;
    await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `koi:two-stage:received:${suffix}`,
      status: "received_at_hub",
      occurredAt: new Date(startedAt.getTime() + 3_000),
    });
    await logistics.recordMeasuredPackage({
      shipmentId,
      actualWeightGrams: 2_000,
      lengthMm: 400,
      widthMm: 300,
      heightMm: 200,
      measuredAt: new Date(startedAt.getTime() + 4_000),
    });
    await logistics.reviewRestriction({
      shipmentId,
      status: "eligible",
      reason: "Automated local verification only.",
    });
    const [shipmentPackage] = await database.select().from(shipmentPackages)
      .where(eq(shipmentPackages.shipmentId, shipmentId))
      .limit(1);
    if (!shipmentPackage) throw new Error("The physical verification package was not found.");
    const calculation = confirmDeliveryProviderCost({
      packages: [{
        shipmentPackageId: shipmentPackage.id,
        pieceNumber: shipmentPackage.pieceNumber,
        providerPieceId: shipmentPackage.providerPieceId,
        weightGrams: shipmentPackage.actualWeightGrams,
        lengthMm: shipmentPackage.lengthMm,
        widthMm: shipmentPackage.widthMm,
        heightMm: shipmentPackage.heightMm,
        measurementSource: shipmentPackage.measurementSource,
      }],
      providerQuote: {
        provider: "dhl",
        serviceName: "Verification only",
        currency: "NGN",
        providerCostMinor: 3_500_000,
        sourceReference: `DHL-TWO-STAGE-VERIFY-${suffix}`,
        volumetricWeightGrams: 4_800,
        chargeableWeightGrams: 4_800,
        billedWeightGrams: 5_000,
      },
    });
    if (!calculation.ok) throw new Error(calculation.message);
    const breakdown = composeDeliveryCharge({
      currency: "NGN",
      providerCostMinor: calculation.providerCostMinor,
      logisticsMarginMinor: 1_000_000,
      localDeliveryMinor: 1_000_000,
      customsDutyMinor: 2_500_000,
    });
    if (!breakdown) throw new Error("The delivery breakdown could not be composed.");
    const quote = await quoteRepository.createQuote({
      publicReference: `KOI-DELIVERY-QUOTE-VERIFY-${suffix}`,
      calculation,
      breakdown,
      destinationZoneId: zone.id,
      destinationCountryCode: "NG",
      customsStatus: "estimated",
      shipmentId,
      confirmedAt: new Date(startedAt.getTime() + 5_000),
      expiresAt: new Date(startedAt.getTime() + 60 * 60 * 1_000),
    });
    quoteId = quote.id;
    await database.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
    await expectRejected(
      "cancelled order delivery payment request",
      () => paymentRepository.createDeliveryRequest({
        publicReference: `KOI-DELIVERY-PAYMENT-CANCELLED-${suffix}`,
        shipmentId: shipmentId!,
        createdAt: new Date(startedAt.getTime() + 5_100),
        expiresAt: new Date(startedAt.getTime() + 30 * 60 * 1_000),
      }),
      "order is not eligible",
    );
    await database.update(orders).set({ status: "delivered" }).where(eq(orders.id, orderId));
    await expectRejected(
      "delivered order delivery payment request",
      () => paymentRepository.createDeliveryRequest({
        publicReference: `KOI-DELIVERY-PAYMENT-DELIVERED-${suffix}`,
        shipmentId: shipmentId!,
        createdAt: new Date(startedAt.getTime() + 5_200),
        expiresAt: new Date(startedAt.getTime() + 30 * 60 * 1_000),
      }),
      "order is not eligible",
    );
    await database.update(orders).set({ status: "paid" }).where(eq(orders.id, orderId));
    await database.update(shipments).set({ status: "picked_up" }).where(eq(shipments.id, shipmentId));
    await expectRejected(
      "dispatched shipment delivery payment request",
      () => paymentRepository.createDeliveryRequest({
        publicReference: `KOI-DELIVERY-PAYMENT-DISPATCHED-${suffix}`,
        shipmentId: shipmentId!,
        createdAt: new Date(startedAt.getTime() + 5_300),
        expiresAt: new Date(startedAt.getTime() + 30 * 60 * 1_000),
      }),
      "shipment is not eligible",
    );
    await database.update(shipments).set({ status: "quoted" }).where(eq(shipments.id, shipmentId));
    const deliveryRequest = await paymentRepository.createDeliveryRequest({
      publicReference: `KOI-DELIVERY-PAYMENT-VERIFY-${suffix}`,
      shipmentId,
      createdAt: new Date(startedAt.getTime() + 6_000),
      expiresAt: new Date(startedAt.getTime() + 30 * 60 * 1_000),
    });
    if (deliveryRequest.amountMinor !== 5_500_000) {
      throw new Error("Customs was incorrectly included in the delivery payment request.");
    }
    await expectRejected(
      "provider reference reuse across requests",
      () => paymentRepository.recordVerifiedPayment({
        paymentRequestId: deliveryRequest.id,
        provider: "paystack",
        providerReference: productProviderReference,
        currency: "NGN",
        verifiedAmountMinor: deliveryRequest.amountMinor,
        verifiedAt: new Date(startedAt.getTime() + 6_500),
      }),
      "belongs to another request",
    );
    await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `dhl:two-stage:booked:${suffix}`,
      status: "booked",
      occurredAt: new Date(startedAt.getTime() + 7_000),
    });
    await expectRejected(
      "unpaid delivery dispatch",
      () => logistics.recordTrackingEvent({
        shipmentId: shipmentId!,
        providerEventId: `dhl:two-stage:unpaid-pickup:${suffix}`,
        status: "picked_up",
        occurredAt: new Date(startedAt.getTime() + 8_000),
      }),
      "until its delivery payment is verified",
    );
    const [failedDeliveryAttempt] = await database.insert(payments).values({
      orderId,
      paymentRequestId: deliveryRequest.id,
      purpose: deliveryRequest.purpose,
      provider: "paystack",
      providerReference: `PAYSTACK-DELIVERY-${suffix}`,
      currency: deliveryRequest.currency,
      expectedAmountMinor: deliveryRequest.amountMinor,
      verifiedAmountMinor: deliveryRequest.amountMinor,
      status: "failed",
    }).returning();
    if (!failedDeliveryAttempt) throw new Error("The failed delivery attempt could not be created.");
    const reconciledDeliveryPayment = await paymentRepository.recordVerifiedPayment({
      paymentRequestId: deliveryRequest.id,
      provider: "paystack",
      providerReference: `PAYSTACK-DELIVERY-${suffix}`,
      currency: "NGN",
      verifiedAmountMinor: deliveryRequest.amountMinor,
      verifiedAt: new Date(startedAt.getTime() + 9_000),
    });
    if (reconciledDeliveryPayment.id !== failedDeliveryAttempt.id || reconciledDeliveryPayment.status !== "success") {
      throw new Error("The failed delivery payment was not reconciled in place.");
    }
    await logistics.recordTrackingEvent({
      shipmentId,
      providerEventId: `dhl:two-stage:paid-pickup:${suffix}`,
      status: "picked_up",
      occurredAt: new Date(startedAt.getTime() + 10_000),
    });

    const recordedPayments = await database.select({ purpose: payments.purpose })
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, "success")))
      .orderBy(asc(payments.createdAt));
    const [finalOrder] = await database.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const [finalShipment] = await database.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    if (
      recordedPayments.map((payment) => payment.purpose).join(",") !== "product_and_service,delivery"
      || finalOrder?.serviceFeeMinor !== 7_500_000
      || finalOrder.shippingTotalMinor !== 5_500_000
      || finalOrder.totalMinor !== 63_000_000
      || finalShipment?.status !== "picked_up"
    ) {
      throw new Error("The two-stage payment snapshots or dispatch state are inconsistent.");
    }
    console.log(JSON.stringify({
      status: "verified",
      productAndServicePaymentMinor: productRequest.amountMinor,
      deliveryPaymentMinor: deliveryRequest.amountMinor,
      customsIncludedInDeliveryPayment: false,
      paymentPurposes: recordedPayments.map((payment) => payment.purpose),
      invalidLifecycleRequestsRejected: true,
      pendingAndFailedAttemptsReconciledInPlace: true,
      successfulReplayIdempotent: true,
      refundedAttemptRejected: true,
      crossRequestReferenceReuseRejected: true,
      unpaidDispatchRejected: true,
      paidDispatchStatus: finalShipment.status,
    }, null, 2));
  } finally {
    if (orderId) await database.delete(payments).where(eq(payments.orderId, orderId));
    if (shipmentId) await database.delete(shipments).where(eq(shipments.id, shipmentId));
    if (orderId) await database.delete(paymentRequests).where(eq(paymentRequests.orderId, orderId));
    if (quoteId) await database.delete(shippingQuotes).where(eq(shippingQuotes.id, quoteId));
    if (orderId) await database.delete(orders).where(eq(orders.id, orderId));
    if (policyId) await database.delete(serviceFeePolicies).where(eq(serviceFeePolicies.id, policyId));
    if (zoneId) await database.delete(shippingZones).where(eq(shippingZones.id, zoneId));
    await client.end();
  }
}

main().catch((error) => {
  console.error("[verify-two-stage-payment-foundation]", error);
  process.exitCode = 1;
});
