BEGIN;

CREATE TABLE public.catalog_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  official_domain text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.catalog_brands(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  source_storefront_id text NOT NULL,
  country_code char(2) NOT NULL,
  locale text NOT NULL,
  currency char(3) NOT NULL,
  official_base_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_storefronts_provider_source_key UNIQUE (provider, source_storefront_id),
  CONSTRAINT catalog_storefronts_brand_region_key UNIQUE (brand_id, country_code, locale)
);

CREATE TABLE public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES public.catalog_storefronts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  source_product_id text NOT NULL,
  style_code text,
  canonical_url text NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  product_type text,
  department text,
  gender text,
  currency char(3) NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  sale_price_minor bigint CHECK (sale_price_minor >= 0),
  available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  missing_since timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_products_provider_storefront_source_key UNIQUE (provider, storefront_id, source_product_id),
  CONSTRAINT catalog_products_storefront_canonical_url_key UNIQUE (storefront_id, canonical_url),
  CONSTRAINT catalog_products_sale_price_check CHECK (sale_price_minor IS NULL OR sale_price_minor <= price_minor)
);

CREATE TABLE public.catalog_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  official_cdn_url text NOT NULL,
  alt_text text,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  color_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_images_product_url_key UNIQUE (product_id, official_cdn_url)
);

CREATE TABLE public.catalog_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_variant_id text NOT NULL,
  sku text,
  gtin text,
  title text,
  color_name text,
  color_code text,
  size_label text,
  size_system text,
  currency char(3) NOT NULL,
  price_minor bigint CHECK (price_minor >= 0),
  sale_price_minor bigint CHECK (sale_price_minor >= 0),
  available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  missing_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_variants_product_source_key UNIQUE (product_id, source_variant_id),
  CONSTRAINT catalog_product_variants_sale_price_check CHECK (sale_price_minor IS NULL OR price_minor IS NULL OR sale_price_minor <= price_minor)
);

CREATE TABLE public.catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES public.catalog_storefronts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  actor_id text NOT NULL,
  provider_run_id text,
  dataset_id text,
  authoritative boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  products_received integer NOT NULL DEFAULT 0 CHECK (products_received >= 0),
  products_upserted integer NOT NULL DEFAULT 0 CHECK (products_upserted >= 0),
  variants_upserted integer NOT NULL DEFAULT 0 CHECK (variants_upserted >= 0),
  images_upserted integer NOT NULL DEFAULT 0 CHECK (images_upserted >= 0),
  products_marked_stale integer NOT NULL DEFAULT 0 CHECK (products_marked_stale >= 0),
  error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  CONSTRAINT catalog_sync_runs_status_check CHECK (status IN ('running', 'succeeded', 'failed', 'partial')),
  CONSTRAINT catalog_sync_runs_provider_run_key UNIQUE NULLS NOT DISTINCT (provider, provider_run_id)
);

CREATE TABLE public.catalog_sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES public.catalog_sync_runs(id) ON DELETE CASCADE,
  source_product_id text,
  source_variant_id text,
  stage text NOT NULL,
  error_code text,
  error_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_storefronts_brand_active_idx ON public.catalog_storefronts (brand_id, is_active);
CREATE INDEX catalog_products_storefront_active_idx ON public.catalog_products (storefront_id, is_active, available);
CREATE INDEX catalog_products_storefront_style_code_idx ON public.catalog_products (storefront_id, style_code) WHERE style_code IS NOT NULL;
CREATE INDEX catalog_products_last_seen_idx ON public.catalog_products (storefront_id, last_seen_at);
CREATE INDEX catalog_product_images_product_position_idx ON public.catalog_product_images (product_id, position);
CREATE INDEX catalog_product_variants_product_active_idx ON public.catalog_product_variants (product_id, is_active, available);
CREATE INDEX catalog_product_variants_sku_idx ON public.catalog_product_variants (sku) WHERE sku IS NOT NULL;
CREATE INDEX catalog_product_variants_gtin_idx ON public.catalog_product_variants (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX catalog_sync_runs_storefront_started_idx ON public.catalog_sync_runs (storefront_id, started_at DESC);
CREATE INDEX catalog_sync_errors_run_idx ON public.catalog_sync_errors (sync_run_id, created_at);

CREATE OR REPLACE FUNCTION public.catalog_ingest_product(
  p_storefront_id uuid,
  p_provider text,
  p_source_product_id text,
  p_product jsonb,
  p_images jsonb,
  p_variants jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  INSERT INTO public.catalog_products (
    storefront_id, provider, source_product_id, style_code, canonical_url, title,
    subtitle, description, product_type, department, gender, currency, price_minor,
    sale_price_minor, available, is_active, first_seen_at, last_seen_at, missing_since,
    last_synced_at, created_at, updated_at
  ) VALUES (
    p_storefront_id, p_provider, p_source_product_id, p_product->>'style_code',
    p_product->>'canonical_url', p_product->>'title', p_product->>'subtitle',
    p_product->>'description', p_product->>'product_type', p_product->>'department',
    p_product->>'gender', p_product->>'currency', (p_product->>'price_minor')::bigint,
    NULLIF(p_product->>'sale_price_minor', '')::bigint, (p_product->>'available')::boolean,
    true, now(), now(), NULL, now(), now(), now()
  ) ON CONFLICT (provider, storefront_id, source_product_id) DO UPDATE SET
    style_code = EXCLUDED.style_code, canonical_url = EXCLUDED.canonical_url,
    title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, description = EXCLUDED.description,
    product_type = EXCLUDED.product_type, department = EXCLUDED.department, gender = EXCLUDED.gender,
    currency = EXCLUDED.currency, price_minor = EXCLUDED.price_minor,
    sale_price_minor = EXCLUDED.sale_price_minor, available = EXCLUDED.available,
    is_active = true, last_seen_at = now(), missing_since = NULL, last_synced_at = now(),
    updated_at = now()
  RETURNING id INTO v_product_id;

  INSERT INTO public.catalog_product_images (product_id, official_cdn_url, alt_text, position, color_name)
  SELECT v_product_id, image.official_cdn_url, image.alt_text, image.position, image.color_name
  FROM jsonb_to_recordset(p_images) AS image(official_cdn_url text, alt_text text, position integer, color_name text)
  ON CONFLICT (product_id, official_cdn_url) DO UPDATE SET
    alt_text = EXCLUDED.alt_text, position = EXCLUDED.position, color_name = EXCLUDED.color_name;

  INSERT INTO public.catalog_product_variants (
    product_id, provider, source_variant_id, sku, gtin, title, color_name, color_code,
    size_label, size_system, currency, price_minor, sale_price_minor, available,
    is_active, last_seen_at, missing_since, created_at, updated_at
  ) SELECT
    v_product_id, p_provider, variant.source_variant_id, variant.sku, variant.gtin,
    variant.title, variant.color_name, variant.color_code, variant.size_label,
    variant.size_system, variant.currency, variant.price_minor, variant.sale_price_minor,
    variant.available, true, now(), NULL, now(), now()
  FROM jsonb_to_recordset(p_variants) AS variant(
    source_variant_id text, sku text, gtin text, title text, color_name text, color_code text,
    size_label text, size_system text, currency char(3), price_minor bigint,
    sale_price_minor bigint, available boolean
  ) ON CONFLICT (product_id, source_variant_id) DO UPDATE SET
    sku = EXCLUDED.sku, gtin = EXCLUDED.gtin, title = EXCLUDED.title,
    color_name = EXCLUDED.color_name, color_code = EXCLUDED.color_code,
    size_label = EXCLUDED.size_label, size_system = EXCLUDED.size_system,
    currency = EXCLUDED.currency, price_minor = EXCLUDED.price_minor,
    sale_price_minor = EXCLUDED.sale_price_minor, available = EXCLUDED.available,
    is_active = true, last_seen_at = now(), missing_since = NULL, updated_at = now();

  UPDATE public.catalog_product_variants
  SET is_active = false, missing_since = COALESCE(missing_since, now()), updated_at = now()
  WHERE product_id = v_product_id
    AND is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_variants) AS seen(source_variant_id text)
      WHERE seen.source_variant_id = catalog_product_variants.source_variant_id
    );

  RETURN v_product_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_ingest_product(uuid, text, text, jsonb, jsonb, jsonb) FROM PUBLIC;

COMMIT;
