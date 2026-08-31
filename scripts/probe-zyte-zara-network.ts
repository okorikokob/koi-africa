import { loadEnvConfig } from "@next/env";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = Record<string, Json>;

async function main(): Promise<void> {
loadEnvConfig(process.cwd());
const key = process.env.ZYTE_API_KEY;
if (!key) throw new Error("ZYTE_API_KEY is required");
const url = process.argv[2];
if (!url || new URL(url).hostname !== "www.zara.com") throw new Error("Pass an official www.zara.com product URL");

const response = await fetch("https://api.zyte.com/v1/extract", {
  method: "POST",
  headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json" },
  body: JSON.stringify({ url, browserHtml: true, networkCapture: [{ filterType: "url", matchType: "contains", value: "/itxrest/", httpResponseBody: true }] }),
  signal: AbortSignal.timeout(120_000),
});
if (!response.ok) throw new Error(`Zyte HTTP ${response.status}`);
const payload = await response.json() as Obj;
const captures = Array.isArray(payload.networkCapture) ? payload.networkCapture : [];
const summaries: Obj[] = [];
function walk(value: Json, path: string, ancestors: Obj[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach((item, index) => walk(item, `${path}[${index}]`, ancestors)); return; }
  const record = value as Obj;
  if (Array.isArray(record.sizes)) {
    const identity = [...ancestors, record].slice(-5).map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => /^(id|productId|product_id|reference|displayReference|name|color|colorName)$/i.test(key))));
    summaries.push({ path, identity: identity as unknown as Json, firstSizes: record.sizes.slice(0, 4) });
  }
  for (const [keyName, child] of Object.entries(record)) walk(child, `${path}.${keyName}`, [...ancestors, record]);
}
for (const [index, item] of captures.entries()) {
  const capture = item && typeof item === "object" && !Array.isArray(item) ? item as Obj : null;
  const body = typeof capture?.httpResponseBody === "string" ? capture.httpResponseBody : null;
  if (!body) continue;
  try { walk(JSON.parse(Buffer.from(body, "base64").toString("utf8")) as Json, `capture[${index}]`, []); } catch { /* non-JSON */ }
}
console.log(JSON.stringify({ captureCount: captures.length, summaries }, null, 2));
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
