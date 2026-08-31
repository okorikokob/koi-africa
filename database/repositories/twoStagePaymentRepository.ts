import { and, eq, inArray } from "drizzle-orm";
import type { db } from "@/database/client";
import {
  orders,
  orderStatusHistory,
  paymentRequests,
  payments,
  serviceFeePolicies,
  shipments,
  shippingQuotes,
} from "@/database/schema";
import {
  calculateServiceFee,
  orderCanRequestDeliveryPayment,
  orderCanRequestProductPayment,
  paymentMatchesRequest,
  paymentStatusCanBeReconciled,
  shipmentCanRequestDeliveryPayment,
  successfulPaymentMatchesRequestSnapshot,
} from "@/lib/two-stage-payments";

type Database = typeof db;

function validFutureDate(value: Date | null | undefined, after: Date): boolean {
  return value === null || value === undefined
    ? true
    : Number.isFinite(value.getTime()) && value > after;
}

export class TwoStagePaymentRepository {
  constructor(private readonly database: Database) {}

  async createProductAndServiceRequest(input: {
    publicReference: string;
    orderId: string;
    serviceFeePolicyId: string;
    effectiveAt: Date;
    expiresAt?: Date | null;
  }): Promise<typeof paymentRequests.$inferSelect> {
    if (!validFutureDate(input.expiresAt, input.effectiveAt)) {
      throw new Error("The product payment deadline must be after the request time.");
    }
    return this.database.transaction(async (tx) => {
      const [order] = await tx.select().from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);
      if (!order) throw new Error("The order was not found.");
      if (!orderCanRequestProductPayment(order.status)) {
        throw new Error("The order is not eligible for a product payment request at its current stage.");
      }
      const [existingRequest] = await tx.select({ id: paymentRequests.id }).from(paymentRequests).where(and(
        eq(paymentRequests.orderId, order.id),
        eq(paymentRequests.purpose, "product_and_service"),
        inArray(paymentRequests.status, ["pending", "paid"]),
      )).limit(1);
      if (existingRequest) throw new Error("The order already has an active product payment request.");
      const [policy] = await tx.select().from(serviceFeePolicies)
        .where(eq(serviceFeePolicies.id, input.serviceFeePolicyId))
        .limit(1);
      if (!policy) throw new Error("The service-fee policy was not found.");
      const calculation = calculateServiceFee({
        productSubtotalMinor: order.productSubtotalMinor,
        currency: order.pricingCurrency,
        policy,
        effectiveAt: input.effectiveAt,
      });
      if (!calculation.ok) throw new Error(calculation.message);

      const [request] = await tx.insert(paymentRequests).values({
        publicReference: input.publicReference,
        orderId: order.id,
        purpose: "product_and_service",
        status: "pending",
        currency: calculation.currency,
        amountMinor: calculation.productPaymentTotalMinor,
        pricingSnapshot: {
          productSubtotalMinor: calculation.productSubtotalMinor,
          serviceFeeMinor: calculation.serviceFeeMinor,
          serviceFeePolicy: calculation.snapshot,
          deliveryIncluded: false,
          customsIncluded: false,
        },
        expiresAt: input.expiresAt ?? null,
      }).returning();
      if (!request) throw new Error("The product payment request could not be created.");

      const totalMinor = order.productSubtotalMinor
        + calculation.serviceFeeMinor
        + order.shippingTotalMinor
        + order.customsTotalMinor;
      if (!Number.isSafeInteger(totalMinor)) throw new Error("The order total exceeds safe limits.");
      await tx.update(orders).set({
        serviceFeePolicyId: policy.id,
        serviceFeeMinor: calculation.serviceFeeMinor,
        totalMinor,
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id));
      return request;
    });
  }

  async createDeliveryRequest(input: {
    publicReference: string;
    shipmentId: string;
    createdAt: Date;
    expiresAt?: Date | null;
  }): Promise<typeof paymentRequests.$inferSelect> {
    if (!validFutureDate(input.expiresAt, input.createdAt)) {
      throw new Error("The delivery payment deadline must be after the request time.");
    }
    return this.database.transaction(async (tx) => {
      const [shipment] = await tx.select().from(shipments)
        .where(eq(shipments.id, input.shipmentId))
        .for("update")
        .limit(1);
      if (!shipment?.orderId || !shipment.shippingQuoteId) {
        throw new Error("A delivery request requires an order shipment with a confirmed quote.");
      }
      const [order] = await tx.select().from(orders)
        .where(eq(orders.id, shipment.orderId))
        .for("update")
        .limit(1);
      if (!order) throw new Error("The shipment order was not found.");
      if (!orderCanRequestDeliveryPayment(order.status)) {
        throw new Error("The order is not eligible for a delivery payment request at its current stage.");
      }
      if (!shipmentCanRequestDeliveryPayment(shipment.status)) {
        throw new Error("The shipment is not eligible for a delivery payment request at its current stage.");
      }
      const [productPayment] = await tx.select({ id: paymentRequests.id }).from(paymentRequests).where(and(
        eq(paymentRequests.orderId, order.id),
        eq(paymentRequests.purpose, "product_and_service"),
        eq(paymentRequests.status, "paid"),
      )).limit(1);
      if (!productPayment) throw new Error("The product payment must be verified before delivery is requested.");
      const [quote] = await tx.select().from(shippingQuotes)
        .where(eq(shippingQuotes.id, shipment.shippingQuoteId))
        .limit(1);
      if (
        !quote
        || quote.stage !== "confirmed"
        || (quote.status !== "quoted" && quote.status !== "accepted")
        || quote.currency === null
        || quote.amountMinor === null
        || quote.providerCostMinor === null
        || quote.logisticsMarginMinor === null
        || quote.localDeliveryMinor === null
      ) {
        throw new Error("The shipment does not have a complete confirmed delivery quote.");
      }
      if (
        quote.expiresAt !== null
        && (
          input.createdAt >= quote.expiresAt
          || input.expiresAt === null
          || input.expiresAt === undefined
          || input.expiresAt > quote.expiresAt
        )
      ) {
        throw new Error("The delivery payment deadline must remain within the provider quote validity.");
      }
      const [existingRequest] = await tx.select({ id: paymentRequests.id }).from(paymentRequests).where(and(
        eq(paymentRequests.orderId, order.id),
        eq(paymentRequests.purpose, "delivery"),
        inArray(paymentRequests.status, ["pending", "paid"]),
      )).limit(1);
      if (existingRequest) throw new Error("The order already has an active delivery payment request.");

      const [request] = await tx.insert(paymentRequests).values({
        publicReference: input.publicReference,
        orderId: order.id,
        shippingQuoteId: quote.id,
        purpose: "delivery",
        status: "pending",
        currency: quote.currency,
        amountMinor: quote.amountMinor,
        pricingSnapshot: {
          providerCostMinor: quote.providerCostMinor,
          logisticsMarginMinor: quote.logisticsMarginMinor,
          localDeliveryMinor: quote.localDeliveryMinor,
          deliveryTotalMinor: quote.amountMinor,
          customsIncluded: false,
        },
        expiresAt: input.expiresAt ?? null,
      }).returning();
      if (!request) throw new Error("The delivery payment request could not be created.");

      const totalMinor = order.productSubtotalMinor
        + order.serviceFeeMinor
        + quote.amountMinor
        + order.customsTotalMinor;
      if (!Number.isSafeInteger(totalMinor)) throw new Error("The order total exceeds safe limits.");
      await tx.update(orders).set({
        shippingQuoteId: quote.id,
        shippingTotalMinor: quote.amountMinor,
        totalMinor,
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id));
      await tx.update(shipments).set({
        deliveryPaymentRequestId: request.id,
        updatedAt: new Date(),
      }).where(eq(shipments.id, shipment.id));
      return request;
    });
  }

  async recordVerifiedPayment(input: {
    paymentRequestId: string;
    provider: string;
    providerReference: string;
    currency: string;
    verifiedAmountMinor: number;
    channel?: string | null;
    providerResponse?: Record<string, unknown> | null;
    verifiedAt: Date;
  }): Promise<typeof payments.$inferSelect> {
    return this.database.transaction(async (tx) => {
      const [request] = await tx.select().from(paymentRequests)
        .where(eq(paymentRequests.id, input.paymentRequestId))
        .for("update")
        .limit(1);
      if (!request) throw new Error("The payment request was not found.");
      const [existingPayment] = await tx.select().from(payments).where(and(
        eq(payments.provider, input.provider),
        eq(payments.providerReference, input.providerReference),
      )).for("update").limit(1);
      let payment: typeof payments.$inferSelect;
      if (existingPayment) {
        if (existingPayment.paymentRequestId !== request.id) {
          throw new Error("The provider payment reference belongs to another request.");
        }
        if (existingPayment.status === "success") {
          if (!successfulPaymentMatchesRequestSnapshot({
            request,
            payment: existingPayment,
            currency: input.currency,
            verifiedAmountMinor: input.verifiedAmountMinor,
          })) {
            throw new Error("The successful provider payment does not match the payment request snapshot.");
          }
          if (request.status === "paid") return existingPayment;
          if (!paymentMatchesRequest({ request, ...input })) {
            throw new Error("The successful provider payment cannot settle this payment request.");
          }
          payment = existingPayment;
        } else {
          if (!paymentStatusCanBeReconciled(existingPayment.status)) {
            throw new Error("The provider payment reference cannot be reconciled from its current status.");
          }
          if (
            existingPayment.orderId !== request.orderId
            || existingPayment.purpose !== request.purpose
            || existingPayment.currency.trim().toUpperCase() !== request.currency.trim().toUpperCase()
            || existingPayment.expectedAmountMinor !== request.amountMinor
          ) {
            throw new Error("The existing provider payment does not match the payment request snapshot.");
          }
          if (!paymentMatchesRequest({ request, ...input })) {
            throw new Error("The verified payment does not match the pending payment request.");
          }
          const [reconciledPayment] = await tx.update(payments).set({
            verifiedAmountMinor: input.verifiedAmountMinor,
            status: "success",
            channel: input.channel ?? existingPayment.channel,
            providerResponse: input.providerResponse ?? existingPayment.providerResponse,
            verifiedAt: input.verifiedAt,
            updatedAt: new Date(),
          }).where(and(
            eq(payments.id, existingPayment.id),
            inArray(payments.status, ["pending", "failed"]),
          )).returning();
          if (!reconciledPayment) {
            throw new Error("The provider payment changed concurrently; retry verification.");
          }
          payment = reconciledPayment;
        }
      } else {
        if (!paymentMatchesRequest({ request, ...input })) {
          throw new Error("The verified payment does not match the pending payment request.");
        }
        const [insertedPayment] = await tx.insert(payments).values({
          orderId: request.orderId,
          paymentRequestId: request.id,
          purpose: request.purpose,
          provider: input.provider,
          providerReference: input.providerReference,
          currency: request.currency,
          expectedAmountMinor: request.amountMinor,
          verifiedAmountMinor: input.verifiedAmountMinor,
          status: "success",
          channel: input.channel ?? null,
          providerResponse: input.providerResponse ?? null,
          verifiedAt: input.verifiedAt,
        }).returning();
        if (!insertedPayment) throw new Error("The verified payment could not be recorded.");
        payment = insertedPayment;
      }
      const [updated] = await tx.update(paymentRequests).set({
        status: "paid",
        paidAt: input.verifiedAt,
        updatedAt: new Date(),
      }).where(and(
        eq(paymentRequests.id, request.id),
        eq(paymentRequests.status, "pending"),
      )).returning({ id: paymentRequests.id });
      if (!updated) throw new Error("The payment request changed concurrently; retry verification.");
      if (request.purpose === "product_and_service") {
        const [order] = await tx.select({ status: orders.status }).from(orders)
          .where(eq(orders.id, request.orderId))
          .for("update")
          .limit(1);
        if (!order) throw new Error("The paid order was not found.");
        if (order.status === "pending_quote" || order.status === "awaiting_payment") {
          await tx.update(orders).set({ status: "paid", updatedAt: new Date() })
            .where(eq(orders.id, request.orderId));
          await tx.insert(orderStatusHistory).values({
            orderId: request.orderId,
            fromStatus: order.status,
            toStatus: "paid",
            note: "Product and KOI service payment verified.",
          });
        }
      }
      return payment;
    });
  }

  async isShipmentDeliveryPaid(shipmentId: string): Promise<boolean> {
    const [row] = await this.database.select({ status: paymentRequests.status })
      .from(shipments)
      .innerJoin(paymentRequests, eq(paymentRequests.id, shipments.deliveryPaymentRequestId))
      .where(and(
        eq(shipments.id, shipmentId),
        eq(paymentRequests.purpose, "delivery"),
      ))
      .limit(1);
    return row?.status === "paid";
  }
}
