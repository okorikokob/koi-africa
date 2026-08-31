import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run database commands.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./database/schema/index.ts",
  out: "./database/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: "__koi_migrations",
    schema: "public",
  },
  strict: true,
  verbose: true,
});
