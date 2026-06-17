import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/effect-schema";
import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { Schema } from "effect";

export const TodoTable = pgTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => sql<Date>`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => sql<Date>`now()`)
    .$onUpdateFn(() => sql<Date>`now()`),
});

export const TodoSelectSchema = createSelectSchema(TodoTable, {
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
export const TodoInsertSchema = createInsertSchema(TodoTable);
export const TodoUpdateSchema = createUpdateSchema(TodoTable);
