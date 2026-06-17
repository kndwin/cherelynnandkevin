import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { TodoNotFoundError } from "@/module/todo/todo.repository.schema.ts";
import { TodoSelectSchema, TodoTable } from "@/module/todo/todo.table.ts";
import { Database } from "@/platform/database.interface.ts";

export class TodoRepository extends Context.Service<TodoRepository>()(
  "cherelynnandkevin/server-core/module/todo/TodoRepository",
  {
    make: Effect.gen(function* () {
      const { db } = yield* Database;

      return {
        list: Effect.fn("TodoRepository.list")(function* ({
          input,
        }: {
          readonly input: {
            readonly page?: number | undefined;
            readonly pageSize?: number | undefined;
            readonly completed?: boolean | undefined;
            readonly title?: string | undefined;
          };
        }) {
          const page = Math.max(1, Math.floor(input.page ?? 1));
          const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize ?? 50)));
          const where = and(
            input.completed === undefined ? undefined : eq(TodoTable.completed, input.completed),
            input.title === undefined ? undefined : ilike(TodoTable.title, `%${input.title}%`),
          );
          const rows = yield* db
            .select()
            .from(TodoTable)
            .where(where)
            .orderBy(TodoTable.createdAt, TodoTable.id)
            .limit(pageSize)
            .offset((page - 1) * pageSize);

          return rows.map((row) => Schema.encodeSync(TodoSelectSchema)(row));
        }),
        get: Effect.fn("TodoRepository.get")(function* ({ id }: { readonly id: string }) {
          const rows = yield* db.select().from(TodoTable).where(eq(TodoTable.id, id)).limit(1);
          const row = rows[0];

          if (row === undefined) {
            return yield* new TodoNotFoundError({ id });
          }

          return Schema.encodeSync(TodoSelectSchema)(row);
        }),
        create: Effect.fn("TodoRepository.create")(function* ({
          input,
        }: {
          readonly input: { readonly title: string };
        }) {
          const [row] = yield* db
            .insert(TodoTable)
            .values({
              id: randomUUID(),
              title: input.title,
            })
            .returning();

          return Schema.encodeSync(TodoSelectSchema)(row);
        }),
        update: Effect.fn("TodoRepository.update")(function* ({
          id,
          input,
        }: {
          readonly id: string;
          readonly input: {
            readonly title?: string | undefined;
            readonly completed?: boolean | undefined;
          };
        }) {
          const rows = yield* db
            .update(TodoTable)
            .set(input)
            .where(eq(TodoTable.id, id))
            .returning();
          const row = rows[0];

          if (row === undefined) {
            return yield* new TodoNotFoundError({ id });
          }

          return Schema.encodeSync(TodoSelectSchema)(row);
        }),
        delete: Effect.fn("TodoRepository.delete")(function* ({ id }: { readonly id: string }) {
          const rows = yield* db.delete(TodoTable).where(eq(TodoTable.id, id)).returning({
            id: TodoTable.id,
          });

          if (rows[0] === undefined) {
            return yield* new TodoNotFoundError({ id });
          }

          return { id };
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<TodoRepository, never, Database> = Layer.effect(
    TodoRepository,
  )(TodoRepository.make);
}
