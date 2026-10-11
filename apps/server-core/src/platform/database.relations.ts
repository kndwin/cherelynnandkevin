import { defineRelations } from "drizzle-orm/relations";
import { GuestTable } from "@/module/check-in/guest.table.ts";
import { TodoTable } from "@/module/todo/todo.table.ts";

const schema = {
  GuestTable,
  TodoTable,
};

export const DatabaseRelations = defineRelations(schema);
export type DatabaseRelations = typeof DatabaseRelations;
