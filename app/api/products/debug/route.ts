import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_MCP_URL = "https://catalog.shopify.com/api/ucp/mcp";
const META = {
  "ucp-agent": {
    profile: "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json",
  },
};
const HEADERS = {
  "Content-Type": "application/json",
  "MCP-Protocol-Version": "2026-03-26",
  "Accept": "application/json",
};

async function mcp(name: string, args: Record<string, unknown>) {
  const res = await fetch(SHOPIFY_MCP_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: "2.0", method: "tools/call", id: 1,
      params: { name, arguments: { meta: META, ...args } },
    }),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "list-tools";
  const id = req.nextUrl.searchParams.get("id") ?? "6BTqJsWbD2h53xA6vEWUpA";

  if (action === "list-tools") {
    const res = await fetch(SHOPIFY_MCP_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1, params: {} }),
    });
    return NextResponse.json(await res.json());
  }

  if (action === "variants") {
    const raw = await mcp("search_catalog", {
      catalog: { query: "New Balance sneakers", filters: { available: true }, pagination: { limit: 1 } },
    });
    return NextResponse.json(raw);
  }

  if (action === "lookup") {
    // Test catalog_lookup with a known product id to see if it returns all variants
    const raw = await mcp("lookup_catalog", {
      catalog: { ids: [id] },
    });
    return NextResponse.json(raw);
  }

  if (action === "lookup2") {
    // Try alternate tool name
    const raw = await mcp("get_catalog", {
      catalog: { ids: [id] },
    });
    return NextResponse.json(raw);
  }

  return NextResponse.json({ error: "unknown action" });
}
