import { NikeConnector } from "@/lib/connectors/nike/connector";
import type { BrandConnector } from "@/lib/connectors/types";
import type { Product } from "@/types";

export class BrandConnectorRegistry {
  constructor(private readonly connectors: readonly BrandConnector[]) {}

  forProduct(product: Product): BrandConnector | null {
    return this.connectors.find((connector) => connector.supports(product)) ?? null;
  }
}

export const brandConnectorRegistry = new BrandConnectorRegistry([new NikeConnector()]);
