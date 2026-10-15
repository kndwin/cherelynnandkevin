import { integer, jsonb, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { GuestTable } from "../check-in/guest.table.ts";
import type { Attempt } from "./games.logic.ts";
export const GamesTable = pgTable("wedding_games", {
  guestId: uuid("guest_id").notNull().references(() => GuestTable.id, { onDelete: "cascade" }),
  puzzleId: text("puzzle_id").notNull(), revision: integer("revision").notNull().default(0),
  attempt: jsonb("attempt").$type<Attempt>().notNull(),
}, t => [primaryKey({ columns: [t.guestId, t.puzzleId] })]);
