import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";

const globalDatabase = globalThis as typeof globalThis & {
  koiPostgresClient?: ReturnType<typeof postgres>;
};

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return connectionString;
}

const postgresClient = globalDatabase.koiPostgresClient ?? postgres(getConnectionString(), {
  max: process.env.NODE_ENV === "production" ? 10 : 1,
  prepare: false,
});

if (process.env.NODE_ENV !== "production") {
  globalDatabase.koiPostgresClient = postgresClient;
}

export const db = drizzle(postgresClient, { schema });

export async function closeDatabaseConnection(): Promise<void> {
  await postgresClient.end();
}
