import { integer, pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";

export const GuestRelationshipTable = pgTable("guest_relationships", {
  guestAId: uuid("guest_a_id").notNull(),
  guestBId: uuid("guest_b_id").notNull(),
  relationship: text("relationship").notNull(),
}, (table) => [primaryKey({ columns: [table.guestAId, table.guestBId] })]);

export const GuestGroupTable = pgTable("guest_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const RsvpAuditTable = pgTable("rsvp_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetGuestId: uuid("target_guest_id").notNull(),
  actorGuestId: uuid("actor_guest_id"),
  actorKind: text("actor_kind").notNull(),
  revision: integer("revision").notNull(),
  attendance: text("attendance").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
