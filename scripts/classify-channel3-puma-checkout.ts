import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Channel3, type Channel3Api } from "@channel3/sdk";
import { loadEnvConfig } from "@next/env";
import { normalizeChannel3PumaProduct } from "../lib/channel3-puma-normalizer";
import type {
  Channel3PumaFixture,
  Channel3PumaFixtureProduct,
} from "../lib/channel3-puma-types";

type Classification = "checkout_safe" | "missing_required_variants" | "unavailable" | "ambiguous";
type CategoryGroup = "shoes" | "clothing" | "accessories_other";

type ClassificationRow = {
  id: string;
  title: string;
  category: string;
  categoryGroup: CategoryGroup;
  classification: Classification;
  hasSize: boolean;
  hasColour: boolean;
  reason: string;
};

const FOOTWEAR = /shoe|footwear|sneaker|trainer|boot|sandal|slipper/i;
const CLOTHING = /activewear|apparel|clothing|shirt|top|pant|short|jacket|coat|outerwear|swimwear|hosiery|loungewear|dress|skirt|hoodie|sweatshirt|uniform|sock|underwear|vest|outfit/i;

function groupFor(product: Channel3PumaFixtureProduct): CategoryGroup {
  const category = product.product.product_type ?? "";
  const searchable = `${category} ${product.product.title}`;
  if (FOOTWEAR.test(searchable)) return "shoes";
  if (CLOTHING.test(searchable)) return "clothing";
  return "accessories_other";
}

function option(product: Channel3Api.Product, pattern: RegExp): Channel3Api.VariantOption | undefined {
  return product.variants?.options.find((candidate) => pattern.test(candidate.name));
}

function usableValues(candidate: Channel3Api.VariantOption): Channel3Api.OptionValue[] {
  return candidate.values.filter((value) => value.exists && value.available !== "OutOfStock");
}

function effectiveSelectionMatches(requested: Record<string, string>, detail: Channel3Api.Product): boolean {
  const selected = new Map((detail.variants?.selected ?? []).map((value) => [value.name.toLowerCase(), value.label]));
  return Object.entries(requested).every(([name, label]) => selected.get(name.toLowerCase()) === label);
}

function fixtureOffer(product: Channel3PumaFixtureProduct): Channel3Api.ProductOffer {
  const currentMinor = product.product.sale_price_minor ?? product.product.price_minor;
  return {
    url: product.product.canonical_url,
    domain: product.product.merchant_domain,
    availability: "InStock",
    price: {
      price: currentMinor / 100,
      compare_at_price: product.product.sale_price_minor == null ? null : product.product.price_minor / 100,
      currency: product.product.currency,
    },
  };
}

async function classifyProduct(
  client: Channel3,
  fixtureProduct: Channel3PumaFixtureProduct,
): Promise<{ row: ClassificationRow; safeProduct: Channel3PumaFixtureProduct | null }> {
  const categoryGroup = groupFor(fixtureProduct);
  const category = fixtureProduct.product.product_type ?? "Uncategorised";
  const base = {
    id: fixtureProduct.sourceProductId,
    title: fixtureProduct.product.title,
    category,
    categoryGroup,
  };
  if (!fixtureProduct.product.available) {
    return { row: { ...base, classification: "unavailable", hasSize: false, hasColour: false, reason: "Product is unavailable." }, safeProduct: null };
  }

  let detail: Channel3Api.Product;
  try {
    detail = await client.products.retrieve({
      product_id: fixtureProduct.sourceProductId,
      country: "US",
      currency: "USD",
      language: "en",
    });
  } catch {
    return { row: { ...base, classification: "ambiguous", hasSize: false, hasColour: false, reason: "Product detail could not be verified." }, safeProduct: null };
  }

  const sizeOption = option(detail, /size/i);
  const colourOption = option(detail, /colou?r/i);
  const hasSize = Boolean(sizeOption?.values.length);
  const hasColour = Boolean(colourOption?.values.length);
  const requiresSize = categoryGroup === "shoes" || categoryGroup === "clothing";

  if (requiresSize && !sizeOption) {
    return { row: { ...base, classification: "missing_required_variants", hasSize, hasColour, reason: "Size-dependent category has no Size option." }, safeProduct: null };
  }
  if (requiresSize && usableValues(sizeOption!).length === 0) {
    return { row: { ...base, classification: "unavailable", hasSize, hasColour, reason: "No supplied Size value is both real and not out of stock." }, safeProduct: null };
  }

  const requested: Record<string, string> = {};
  for (const detailOption of detail.variants?.options ?? []) {
    const values = usableValues(detailOption);
    if (values.length === 0) {
      if (detailOption.values.length > 0) {
        return { row: { ...base, classification: "unavailable", hasSize, hasColour, reason: `${detailOption.name} has no usable values.` }, safeProduct: null };
      }
      continue;
    }
    const currentlySelected = detail.variants?.selected.find((selected) =>
      selected.name.toLowerCase() === detailOption.name.toLowerCase()
        && values.some((value) => value.label === selected.label),
    );
    requested[detailOption.name] = currentlySelected?.label ?? values[0].label;
  }

  let effectiveDetail = detail;
  if (Object.keys(requested).length > 0) {
    try {
      effectiveDetail = await client.products.retrieve({
        product_id: detail.id,
        country: "US",
        currency: "USD",
        language: "en",
        selected_options: requested,
      });
    } catch {
      return { row: { ...base, classification: "ambiguous", hasSize, hasColour, reason: "Option selection request failed." }, safeProduct: null };
    }
    if (!effectiveSelectionMatches(requested, effectiveDetail)) {
      return { row: { ...base, classification: "ambiguous", hasSize, hasColour, reason: "Channel3 relaxed or changed the requested option state." }, safeProduct: null };
    }
  }

  const normalized = normalizeChannel3PumaProduct({ ...effectiveDetail, offers: [fixtureOffer(fixtureProduct)] });
  if (!normalized.product) {
    return { row: { ...base, classification: "ambiguous", hasSize, hasColour, reason: `Normalizer rejected effective state: ${normalized.reason}.` }, safeProduct: null };
  }
  if (requiresSize && !normalized.product.variants.some((variant) =>
    Object.keys(variant.option_values).some((name) => /size/i.test(name)),
  )) {
    return { row: { ...base, classification: "ambiguous", hasSize, hasColour, reason: "Effective checkout variant did not preserve Size." }, safeProduct: null };
  }

  return {
    row: { ...base, classification: "checkout_safe", hasSize, hasColour, reason: "Required options produced an exact effective Channel3 state." },
    safeProduct: normalized.product,
  };
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) throw new Error("CHANNEL3_API_KEY is required for Puma checkout classification.");

  const source = JSON.parse(await readFile(resolve("data/puma-demo-catalog.json"), "utf8")) as Channel3PumaFixture;
  const client = new Channel3({ apiKey, country: "US", currency: "USD", language: "en" });
  const rows: ClassificationRow[] = [];
  const safeProducts: Channel3PumaFixtureProduct[] = [];

  for (const product of source.products) {
    const result = await classifyProduct(client, product);
    rows.push(result.row);
    if (result.safeProduct) safeProducts.push(result.safeProduct);
  }

  const counts = Object.fromEntries(
    (["checkout_safe", "missing_required_variants", "unavailable", "ambiguous"] as const)
      .map((classification) => [classification, rows.filter((row) => row.classification === classification).length]),
  );
  const safeRows = rows.filter((row) => row.classification === "checkout_safe");
  const report = {
    sourceProducts: source.products.length,
    counts,
    checkoutSafe: {
      total: safeRows.length,
      shoes: safeRows.filter((row) => row.categoryGroup === "shoes").length,
      clothing: safeRows.filter((row) => row.categoryGroup === "clothing").length,
      accessoriesOther: safeRows.filter((row) => row.categoryGroup === "accessories_other").length,
      withSize: safeRows.filter((row) => row.hasSize).length,
      withColour: safeRows.filter((row) => row.hasColour).length,
    },
    hiddenMissingRequiredVariants: rows.filter((row) => row.classification === "missing_required_variants").length,
    categories: Object.fromEntries([...new Set(rows.map((row) => row.category))].sort().map((category) => [
      category,
      Object.fromEntries(([
        "checkout_safe",
        "missing_required_variants",
        "unavailable",
        "ambiguous",
      ] as const).map((classification) => [classification, rows.filter((row) => row.category === category && row.classification === classification).length])),
    ])),
  };

  if (process.argv.includes("--write")) {
    const output: Channel3PumaFixture = {
      version: 1,
      generatedAt: new Date().toISOString(),
      provider: "channel3",
      brand: "Puma",
      stats: source.stats,
      products: safeProducts,
    };
    await writeFile(resolve("data/puma-checkout-safe-catalog.json"), `${JSON.stringify(output)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((error: unknown) => {
  console.error("[scripts/classify-channel3-puma-checkout]", error);
  process.exitCode = 1;
});
