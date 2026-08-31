import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";

const globalDatabase = globalThis as typeof globalThis & {
  koiPostgresClient?: ReturnType<typeof postgres>;
};

let postgresClient: ReturnType<typeof postgres> | undefined;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return connectionString;
}

function createDatabase() {
  postgresClient = globalDatabase.koiPostgresClient ?? postgres(getConnectionString(), {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });
  if (process.env.NODE_ENV !== "production") globalDatabase.koiPostgresClient = postgresClient;
  return drizzle(postgresClient, { schema });
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | undefined;

function getDatabase(): Database {
  database ??= createDatabase();
  return database;
}

// Next.js evaluates route modules while collecting build output. Defer reading
// DATABASE_URL and opening PostgreSQL until a runtime database method is used.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const activeDatabase = getDatabase();
    const value = Reflect.get(activeDatabase, property);
    return typeof value === "function" ? value.bind(activeDatabase) : value;
  },
});

export async function closeDatabaseConnection(): Promise<void> {
  if (!postgresClient) return;
  await postgresClient.end();
  postgresClient = undefined;
  database = undefined;
}
