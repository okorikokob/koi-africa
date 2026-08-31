# KOI PostgreSQL foundation

This directory is isolated from the current InsForge-backed application. No live route imports `database/client.ts` yet.

## Local setup

1. Install PostgreSQL locally or run it through Docker.
2. Create a database named `koi_africa`.
3. Add its connection string to `.env.local`:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/koi_africa
   ```

4. Create the local database with `npm run db:setup`.
5. Apply committed migrations with `npm run db:migrate`.
6. Verify the local schema with `npm run db:verify`.
7. Inspect the schema with `npm run db:studio` if desired.

`npm run db:generate` creates SQL migrations from the TypeScript schema. Generated SQL must be reviewed before it is applied.

## Money and currencies

Money is stored as integer minor units together with an ISO currency code. For example, `12000` and `USD` means `$120.00`. Exchange rates use fixed-precision decimals and orders retain the exact rate snapshot used for their quote.

## Shipping measurements

Weights use grams and dimensions use millimetres. Integer base units avoid ambiguous rounding. A variant can override its product's measurements. Shipping rate cards store their own volumetric divisor because that value belongs to the logistics provider, not to KOI's product catalogue.

## DHL logistics foundation

`KOI_DHL_LOGISTICS_FOUNDATION` is disabled by default. The local readiness report is available with `npm run logistics:dhl:readiness` when the flag is enabled for development.

The estimate calculator requires complete trusted catalogue measurements for every shipment line and an active stored rate card. It calculates actual and volumetric weight, selects the larger chargeable weight, and rounds it using the rate card's billing increment. It does not contain a DHL rate, a KOI margin, or inferred product measurements.

Estimated quotes accept measurements supplied by the product provider or physically measured by KOI. Confirmed quotes use the exact physical package pieces measured at the KOI hub plus an identified official DHL quote; KOI does not guess DHL's multi-piece pricing formula. A confirmed quote is attached to its shipment and is required before booking. Provider cost, KOI logistics margin, Nigerian local delivery, and Customs remain separate money components. Customs is not included in the delivery total unless it has been independently confirmed.

Operational shipment records support restriction review before booking, provider tracking events, post-shipment Customs charges, and customer-paid return shipping. Ordinary product-page reads do not create shipment or quote records.

## Two-stage payment foundation

`KOI_TWO_STAGE_PAYMENTS` is disabled by default. The foundation records separate `product_and_service` and `delivery` payment requests without changing the existing checkout or Paystack routes.

Product requests require an active service-fee policy with an explicit approval reference; no percentage or minimum fee is seeded. Delivery requests require a paid product request and the shipment's confirmed provider quote. Customs is excluded from both request types and remains a separate operational charge. When the flag is enabled, a shipment may be booked but cannot be picked up or dispatched until its exact delivery request is paid.

## Ingestion boundary

The schema records provider and stable source IDs but does not depend on any provider payload. The KOI Universal Scraper integration will be designed only after its separate project and API contract are inspected.
