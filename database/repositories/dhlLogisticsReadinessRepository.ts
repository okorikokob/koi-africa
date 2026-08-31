import { sql } from "drizzle-orm";
import type { db } from "@/database/client";

type Database = typeof db;

export type DhlLogisticsReadiness = {
  activeNikeProducts: number;
  activeNikeVariants: number;
  estimatedQuoteReadyProducts: number;
  estimatedQuoteReadyVariants: number;
  physicallyMeasuredNikeShipments: number;
  confirmedQuotedNikeShipments: number;
  physicalShipmentPackages: number;
  activeShippingZones: number;
  activeDhlRateCards: number;
};

export class DhlLogisticsReadinessRepository {
  constructor(private readonly database: Database) {}

  async inspectNike(): Promise<DhlLogisticsReadiness> {
    const result = await this.database.execute(sql<DhlLogisticsReadiness>`
      with nike_products as (
        select p.*
        from products p
        inner join storefronts s on s.id = p.storefront_id
        where p.is_active = true and s.source_storefront_id = 'nike-us'
      ), nike_variants as (
        select v.*
        from product_variants v
        inner join nike_products p on p.id = v.product_id
        where v.is_active = true
      )
      select
        (select count(*)::int from nike_products) as "activeNikeProducts",
        (select count(*)::int from nike_variants) as "activeNikeVariants",
        (select count(*)::int from nike_products p where
          (p.weight_grams is not null and p.length_mm is not null and p.width_mm is not null and p.height_mm is not null
            and p.measurement_source in ('provider', 'measured'))
          or exists (select 1 from nike_variants v where v.product_id = p.id
            and v.weight_grams is not null and v.length_mm is not null and v.width_mm is not null and v.height_mm is not null
            and v.measurement_source in ('provider', 'measured'))
        ) as "estimatedQuoteReadyProducts",
        (select count(*)::int from nike_variants where
          weight_grams is not null and length_mm is not null and width_mm is not null and height_mm is not null
          and measurement_source in ('provider', 'measured')
        ) as "estimatedQuoteReadyVariants",
        (select count(*)::int from shipments sh where lower(sh.provider) = 'dhl'
          and exists (select 1 from shipment_items si inner join nike_products p on p.id = si.product_id where si.shipment_id = sh.id)
          and exists (select 1 from shipment_packages sp where sp.shipment_id = sh.id)
        ) as "physicallyMeasuredNikeShipments",
        (select count(*)::int from shipments sh inner join shipping_quotes sq on sq.id = sh.shipping_quote_id
          where lower(sh.provider) = 'dhl' and sq.stage = 'confirmed' and sq.status in ('quoted', 'accepted')
          and exists (select 1 from shipment_items si inner join nike_products p on p.id = si.product_id where si.shipment_id = sh.id)
        ) as "confirmedQuotedNikeShipments",
        (select count(*)::int from shipment_packages sp inner join shipments sh on sh.id = sp.shipment_id
          where lower(sh.provider) = 'dhl'
          and exists (select 1 from shipment_items si inner join nike_products p on p.id = si.product_id where si.shipment_id = sh.id)
        ) as "physicalShipmentPackages",
        (select count(*)::int from shipping_zones where is_active = true) as "activeShippingZones",
        (select count(*)::int from shipping_rate_cards where is_active = true and lower(provider) = 'dhl') as "activeDhlRateCards"
    `);
    const row = result[0];
    if (!row) throw new Error("The DHL logistics readiness query returned no result.");
    const integer = (value: unknown, field: string): number => {
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`The DHL logistics readiness field ${field} is invalid.`);
      }
      return value;
    };
    return {
      activeNikeProducts: integer(row.activeNikeProducts, "activeNikeProducts"),
      activeNikeVariants: integer(row.activeNikeVariants, "activeNikeVariants"),
      estimatedQuoteReadyProducts: integer(row.estimatedQuoteReadyProducts, "estimatedQuoteReadyProducts"),
      estimatedQuoteReadyVariants: integer(row.estimatedQuoteReadyVariants, "estimatedQuoteReadyVariants"),
      physicallyMeasuredNikeShipments: integer(row.physicallyMeasuredNikeShipments, "physicallyMeasuredNikeShipments"),
      confirmedQuotedNikeShipments: integer(row.confirmedQuotedNikeShipments, "confirmedQuotedNikeShipments"),
      physicalShipmentPackages: integer(row.physicalShipmentPackages, "physicalShipmentPackages"),
      activeShippingZones: integer(row.activeShippingZones, "activeShippingZones"),
      activeDhlRateCards: integer(row.activeDhlRateCards, "activeDhlRateCards"),
    };
  }
}
