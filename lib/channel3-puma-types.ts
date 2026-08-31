export type Channel3SkipReason =
  | "duplicate_product_id"
  | "missing_brand"
  | "missing_image"
  | "missing_offer"
  | "missing_product_id"
  | "missing_title"
  | "ambiguous_variants"
  | "unavailable_variants"
  | "detail_request_failed";

export type Channel3PumaFixtureVariant = {
  source_variant_id: string;
  sku: null;
  gtin: null;
  option_values: Record<string, string>;
  currency: string;
  price_minor: number;
  sale_price_minor: number | null;
  availability_status: "in_stock";
  available: true;
};

export type Channel3PumaFixtureProduct = {
  sourceProductId: string;
  product: {
    canonical_url: string;
    merchant_domain: "us.puma.com";
    title: string;
    subtitle: string | null;
    description: string | null;
    product_type: string | null;
    currency: string;
    price_minor: number;
    sale_price_minor: number | null;
    availability_status: "in_stock";
    available: true;
  };
  images: Array<{
    official_cdn_url: string;
    alt_text: string;
    position: number;
    color_name: string | null;
  }>;
  variants: Channel3PumaFixtureVariant[];
};

export type Channel3PumaImportStats = {
  brandId: string;
  rawResults: number;
  validProducts: number;
  pagesFetched: number;
  exhaustedBeforeLimit: boolean;
  skipped: Partial<Record<Channel3SkipReason, number>>;
};

export type Channel3PumaFixture = {
  version: 1;
  generatedAt: string | null;
  provider: "channel3";
  brand: "Puma";
  stats: Channel3PumaImportStats | null;
  products: Channel3PumaFixtureProduct[];
};
