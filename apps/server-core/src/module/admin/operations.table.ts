import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const FailedAuthAttemptTable = pgTable("failed_auth_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  normalizedName: text("normalized_name").notNull(),
  reason: text("reason").notNull(),
  count: bigint("attempt_count", { mode: "number" }).notNull().default(1),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("new"),
  notes: text("notes").notNull().default(""),
});
