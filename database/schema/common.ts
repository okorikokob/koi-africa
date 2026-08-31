import { char, timestamp } from "drizzle-orm/pg-core";

export const currencyCode = (name: string) => char(name, { length: 3 });

export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
