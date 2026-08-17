BEGIN;

ALTER TABLE public.catalog_storefronts
  DROP CONSTRAINT IF EXISTS catalog_storefronts_brand_region_key;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_storefronts_brand_provider_region_key
  ON public.catalog_storefronts (brand_id, provider, country_code, locale);

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS rating numeric CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'in_stock'
    CHECK (availability_status IN ('in_stock', 'pre_order', 'out_of_stock'));

ALTER TABLE public.catalog_product_variants
  ADD COLUMN IF NOT EXISTS option_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'in_stock'
    CHECK (availability_status IN ('in_stock', 'pre_order', 'out_of_stock'));

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.catalog_ingest_brightdata_product(
  p_storefront_id uuid,
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
    storefront_id, provider, source_product_id, style_code, canonical_url, title, subtitle,
    description, product_type, department, gender, currency, price_minor, sale_price_minor,
    rating, review_count, availability_status, available, is_active, first_seen_at,
    last_seen_at, missing_since, last_synced_at, created_at, updated_at
  ) VALUES (
    p_storefront_id, 'brightdata', p_source_product_id, p_product->>'style_code',
    p_product->>'canonical_url', p_product->>'title', p_product->>'subtitle',
    p_product->>'description', p_product->>'product_type', p_product->>'department',
    p_product->>'gender', p_product->>'currency', (p_product->>'price_minor')::bigint,
    NULLIF(p_product->>'sale_price_minor', '')::bigint, NULLIF(p_product->>'rating', '')::numeric,
    COALESCE((p_product->>'review_count')::integer, 0), p_product->>'availability_status',
    (p_product->>'available')::boolean, true, now(), now(), NULL, now(), now(), now()
  ) ON CONFLICT (provider, storefront_id, source_product_id) DO UPDATE SET
    canonical_url = EXCLUDED.canonical_url, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description, product_type = EXCLUDED.product_type,
    department = EXCLUDED.department, gender = EXCLUDED.gender, currency = EXCLUDED.currency,
    price_minor = EXCLUDED.price_minor, sale_price_minor = EXCLUDED.sale_price_minor,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
    availability_status = EXCLUDED.availability_status, available = EXCLUDED.available,
    is_active = true, last_seen_at = now(), missing_since = NULL, last_synced_at = now(), updated_at = now()
  RETURNING id INTO v_product_id;

  INSERT INTO public.catalog_product_images (product_id, official_cdn_url, alt_text, position, color_name)
  SELECT v_product_id, image.official_cdn_url, image.alt_text, image.position, image.color_name
  FROM jsonb_to_recordset(p_images) AS image(official_cdn_url text, alt_text text, position integer, color_name text)
  ON CONFLICT (product_id, official_cdn_url) DO UPDATE SET
    alt_text = EXCLUDED.alt_text, position = EXCLUDED.position, color_name = EXCLUDED.color_name;

  INSERT INTO public.catalog_product_variants (
    product_id, provider, source_variant_id, sku, gtin, title, color_name, color_code,
    size_label, size_system, option_values, currency, price_minor, sale_price_minor,
    availability_status, available, is_active, last_seen_at, missing_since, created_at, updated_at
  ) SELECT v_product_id, 'brightdata', variant.source_variant_id, variant.sku, variant.gtin,
    variant.title, variant.color_name, variant.color_code, variant.size_label, variant.size_system,
    variant.option_values, variant.currency, variant.price_minor, variant.sale_price_minor,
    variant.availability_status, variant.available, true, now(), NULL, now(), now()
  FROM jsonb_to_recordset(p_variants) AS variant(
    source_variant_id text, sku text, gtin text, title text, color_name text, color_code text,
    size_label text, size_system text, option_values jsonb, currency char(3), price_minor bigint,
    sale_price_minor bigint, availability_status text, available boolean
  ) ON CONFLICT (product_id, source_variant_id) DO UPDATE SET
    sku = EXCLUDED.sku, gtin = EXCLUDED.gtin, color_name = EXCLUDED.color_name,
    color_code = EXCLUDED.color_code, size_label = EXCLUDED.size_label,
    option_values = EXCLUDED.option_values, price_minor = EXCLUDED.price_minor,
    sale_price_minor = EXCLUDED.sale_price_minor, availability_status = EXCLUDED.availability_status,
    available = EXCLUDED.available, is_active = true, last_seen_at = now(), missing_since = NULL, updated_at = now();

  RETURN v_product_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_ingest_brightdata_product(uuid, text, jsonb, jsonb, jsonb) FROM PUBLIC;

COMMIT;
