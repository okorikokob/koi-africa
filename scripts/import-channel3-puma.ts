import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { fetchPumaFixture } from "../lib/channel3-puma-provider";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const fixture = await fetchPumaFixture();
  const outputPath = resolve(process.argv[2] ?? "data/puma-demo-catalog.json");
  await writeFile(outputPath, `${JSON.stringify(fixture)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, ...fixture.stats }, null, 2));
}

void main().catch((error: unknown) => {
  console.error("[scripts/import-channel3-puma]", error);
  process.exitCode = 1;
});
