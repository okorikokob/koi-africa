import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ingestBrightDataNikeRecords } from "../lib/brightdata-catalog-ingestion";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !process.argv.includes("--confirm")) {
    throw new Error("Usage: npm run catalog:nike:import -- <brightdata.json> --confirm");
  }
  const raw = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Bright Data export must be a JSON array.");
  console.log(JSON.stringify(await ingestBrightDataNikeRecords(raw), null, 2));
}

void main();
