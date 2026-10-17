import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Historical draft_disabled rows are never eligible for dispatch.
export const RsvpEmailDraftTable = pgTable("rsvp_email_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestId: uuid("guest_id").notNull(),
  revision: integer("revision").notNull(),
  kind: text("kind").notNull().default("rsvp_confirmation"),
  status: text("status").notNull().default("draft_disabled"),
  templateVersion: integer("template_version").notNull().default(1),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  snapshot: jsonb("snapshot").$type<{ displayName: string; email: string; attending: "Yes" | "No"; dietaryRequirements: string }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("rsvp_email_drafts_revision_kind_key").on(table.guestId, table.revision, table.kind)]);
