import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeBrightDataSephoraRecords } from "../lib/brightdata-sephora-normalizer";

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath) throw new Error("Usage: npm run catalog:sephora:dry-run -- <brightdata.json> [fixture.json]");
  const raw = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Bright Data export must be a JSON array.");
  const result = normalizeBrightDataSephoraRecords(raw);
  console.log(JSON.stringify({ ...result.stats, rejected: result.rejected.length, conflicts: result.conflicts.length, rejectionSamples: result.rejected.slice(0, 20), conflictSamples: result.conflicts.slice(0, 20) }, null, 2));
  if (outputPath) await writeFile(resolve(outputPath), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), products: result.products }));
  if (result.rejected.length || result.conflicts.length) process.exitCode = 1;
}

void main();
