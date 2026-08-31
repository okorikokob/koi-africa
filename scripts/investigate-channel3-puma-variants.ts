import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Channel3, type Channel3Api } from "@channel3/sdk";
import { loadEnvConfig } from "@next/env";
import type { Channel3PumaFixture } from "../lib/channel3-puma-types";

type OptionProbe = {
  name: string;
  values: Array<{
    label: string;
    exists: boolean;
    available: Channel3Api.OfferAvailabilityStatus | null;
    productId: string | null;
  }>;
};

type ProductProbe = {
  productId: string;
  title: string;
  category: string | null;
  variantsPresent: boolean;
  options: OptionProbe[];
  selected: Channel3Api.SelectedOption[];
  selectionProbe: null | {
    requested: Record<string, string>;
    effectiveProductId: string;
    effectiveSelected: Channel3Api.SelectedOption[];
    changedProductId: boolean;
    selectionHonored: boolean;
  };
};

const SAMPLE_IDS = [
  "rx6KWcc",
  "OUYfXKW",
  "4802vBA",
  "LOx5CcH",
  "Y3fFUWk",
  "4MuvoT8",
  "TBv2i1o",
  "oxpMK0M",
  "KVpdTc2",
  "3ZWDCzc",
] as const;

function optionsFrom(product: Channel3Api.Product): OptionProbe[] {
  return (product.variants?.options ?? []).map((option) => ({
    name: option.name,
    values: option.values.map((value) => ({
      label: value.label,
      exists: value.exists,
      available: value.available ?? null,
      productId: value.product_id ?? null,
    })),
  }));
}

function firstAlternative(product: Channel3Api.Product): Record<string, string> | null {
  const selected = new Map((product.variants?.selected ?? []).map((option) => [option.name.toLowerCase(), option.label]));
  for (const option of product.variants?.options ?? []) {
    const candidate = option.values.find((value) => value.exists && value.label !== selected.get(option.name.toLowerCase()));
    if (candidate) return { [option.name]: candidate.label };
  }
  return null;
}

function selectionWasHonored(requested: Record<string, string>, selected: Channel3Api.SelectedOption[]): boolean {
  const effective = new Map(selected.map((option) => [option.name.toLowerCase(), option.label]));
  return Object.entries(requested).every(([name, label]) => effective.get(name.toLowerCase()) === label);
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) throw new Error("CHANNEL3_API_KEY is required for the Puma variant investigation.");

  const fixture = JSON.parse(
    await readFile(resolve("data/puma-demo-catalog.json"), "utf8"),
  ) as Channel3PumaFixture;
  const fixtureIds = new Set(fixture.products.map((product) => product.sourceProductId));
  const missingIds = SAMPLE_IDS.filter((id) => !fixtureIds.has(id));
  if (missingIds.length > 0) throw new Error(`Sample IDs missing from Puma fixture: ${missingIds.join(", ")}`);

  const client = new Channel3({ apiKey, country: "US", currency: "USD", language: "en" });
  const probes: ProductProbe[] = [];

  for (const productId of SAMPLE_IDS) {
    const detail = await client.products.retrieve({
      product_id: productId,
      country: "US",
      currency: "USD",
      language: "en",
    });
    const requested = firstAlternative(detail);
    let selectionProbe: ProductProbe["selectionProbe"] = null;
    if (requested) {
      const selectedDetail = await client.products.retrieve({
        product_id: productId,
        country: "US",
        currency: "USD",
        language: "en",
        selected_options: requested,
      });
      const effectiveSelected = selectedDetail.variants?.selected ?? [];
      selectionProbe = {
        requested,
        effectiveProductId: selectedDetail.id,
        effectiveSelected,
        changedProductId: selectedDetail.id !== detail.id,
        selectionHonored: selectionWasHonored(requested, effectiveSelected),
      };
    }
    probes.push({
      productId: detail.id,
      title: detail.title,
      category: detail.category?.title ?? null,
      variantsPresent: detail.variants != null,
      options: optionsFrom(detail),
      selected: detail.variants?.selected ?? [],
      selectionProbe,
    });
  }

  console.log(JSON.stringify({ sampleSize: probes.length, products: probes }, null, 2));
}

void main().catch((error: unknown) => {
  console.error("[scripts/investigate-channel3-puma-variants]", error);
  process.exitCode = 1;
});
