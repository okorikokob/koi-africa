function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("InsForge admin configuration is missing.");
  return { baseUrl, apiKey };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`InsForge request failed with ${response.status}.`);
  return (await response.json()) as T;
}

export async function getCatalogRows<T>(
  table: string,
  query: Record<string, string>,
): Promise<T[]> {
  const search = new URLSearchParams(query);
  return request<T[]>(`/api/database/records/${table}?${search.toString()}`, { method: "GET" });
}

export async function upsertCatalogRow<T extends { id: string }>(
  table: string,
  onConflict: string,
  row: Record<string, unknown>,
): Promise<T> {
  const data = await request<T[]>(
    `/api/database/records/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) },
  );
  if (!data[0]) throw new Error(`InsForge did not return an upserted ${table} row.`);
  return data[0];
}

export async function insertCatalogRow<T extends { id: string }>(table: string, row: Record<string, unknown>): Promise<T> {
  const data = await request<T[]>(`/api/database/records/${table}`, {
    method: "POST",
    body: JSON.stringify(row),
  });
  if (!data[0]) throw new Error(`InsForge did not return an inserted ${table} row.`);
  return data[0];
}

export async function updateCatalogRow(table: string, id: string, row: Record<string, unknown>): Promise<void> {
  await request<unknown[]>(`/api/database/records/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(row),
  });
}

export async function callCatalogRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return request<T>(`/api/database/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}
