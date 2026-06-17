import { defineRelations } from "drizzle-orm/relations";
import { TodoTable } from "@/module/todo/todo.table.ts";

const schema = {
  TodoTable,
};

export const DatabaseRelations = defineRelations(schema);
export type DatabaseRelations = typeof DatabaseRelations;
