import { db } from "@/database/client";
import { NikeCatalogReadRepository } from "@/database/repositories/nikeCatalogReadRepository";
import { NikePostgresCatalogReader } from "@/lib/nike-postgres-product-mapper";
import { isPostgresUuid } from "@/lib/postgres-identifiers";
import type { Product } from "@/types";

const repository = new NikeCatalogReadRepository(db);
const reader = new NikePostgresCatalogReader(repository);

export async function getNikePostgresProducts(): Promise<Product[]> {
  return reader.listProducts();
}

export async function getNikePostgresProductById(id: string): Promise<Product | null> {
  if (!isPostgresUuid(id)) return null;
  return reader.findProductById(id);
}

export async function getNikePostgresUnsafeProducts(): Promise<Array<{ id: string; title: string; reason: string }>> {
  return reader.listUnsafeProducts();
}
