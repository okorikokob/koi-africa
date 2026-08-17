import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeBrightDataNikeRecords } from "../lib/brightdata-nike-normalizer";

async function main() {
  const inputPath = process.argv[2];
  const outputFlag = process.argv.indexOf("--output");
  if (!inputPath) throw new Error("Usage: npm run catalog:nike:dry-run -- <brightdata.json> [--output report.json]");
  const raw = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Bright Data export must be a JSON array.");
  const result = normalizeBrightDataNikeRecords(raw);
  const report = {
    ...result.stats,
    rejected: result.rejected.length,
    conflicts: result.conflicts.length,
    rejectionSamples: result.rejected.slice(0, 20),
    conflictSamples: result.conflicts.slice(0, 20),
  };
  console.log(JSON.stringify(report, null, 2));
  const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : process.argv[3];
  if (outputPath) {
    await writeFile(resolve(outputPath), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), products: result.products }));
  }
  if (result.rejected.length || result.conflicts.length) process.exitCode = 1;
}

void main();
