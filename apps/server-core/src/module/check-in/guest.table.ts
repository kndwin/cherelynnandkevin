import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/effect-schema";
import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { Schema } from "effect";

// Guest list storage. display_name is canonical; normalized_name is the
// normalized lookup key with a uniqueness constraint. invitation_status
// mirrors the source Tier column (Yes|Maybe); only Yes may
// public-authenticate. rsvp_* columns start blank and are owned by the public
// RSVP flow plus admin edits. internal_notes is admin-only and is never
// returned by public endpoints.
export const GuestTable = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name").notNull(),
    normalizedName: text("normalized_name").notNull().unique(),
    invitationStatus: text("invitation_status").notNull(),
    guestType: text("guest_type").notNull(),
    ownerKey: text("owner_key").notNull(),
    internalNotes: text("internal_notes").notNull().default(""),
    rsvpStatus: text("rsvp_status").notNull().default(""),
    rsvpEmail: text("rsvp_email").notNull().default(""),
    rsvpNotes: text("rsvp_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => sql<Date>`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => sql<Date>`now()`)
      .$onUpdateFn(() => sql<Date>`now()`),
  },
  (table) => [
    check("guests_invitation_status_check", sql`${table.invitationStatus} in ('Yes', 'Maybe')`),
    check("guests_guest_type_check", sql`${table.guestType} in ('Church', 'Family', 'Friends', 'Work')`),
    check("guests_owner_key_check", sql`${table.ownerKey} in ('Kevin', 'Cher')`),
    check("guests_rsvp_status_check", sql`${table.rsvpStatus} in ('', 'Yes', 'No')`),
  ],
);

export const GuestSelectSchema = createSelectSchema(GuestTable, {
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
export const GuestInsertSchema = createInsertSchema(GuestTable);
export const GuestUpdateSchema = createUpdateSchema(GuestTable);
