import { Context, Effect, Layer } from "effect";
import { TodoRepository } from "@/module/todo/todo.repository.default.ts";

export class TodoService extends Context.Service<TodoService>()(
  "cherelynnandkevin/server-core/module/todo/TodoService",
  {
    make: Effect.gen(function* () {
      const repository = yield* TodoRepository;

      return {
        list: Effect.fn("TodoService.list")(function* ({
          input,
        }: {
          readonly input: {
            readonly page?: number | undefined;
            readonly pageSize?: number | undefined;
            readonly completed?: boolean | undefined;
            readonly title?: string | undefined;
          };
        }) {
          return yield* repository.list({ input });
        }),
        get: Effect.fn("TodoService.get")(function* ({ id }: { readonly id: string }) {
          return yield* repository.get({ id });
        }),
        create: Effect.fn("TodoService.create")(function* ({
          input,
        }: {
          readonly input: { readonly title: string };
        }) {
          return yield* repository.create({ input });
        }),
        update: Effect.fn("TodoService.update")(function* ({
          id,
          input,
        }: {
          readonly id: string;
          readonly input: {
            readonly title?: string | undefined;
            readonly completed?: boolean | undefined;
          };
        }) {
          return yield* repository.update({ id, input });
        }),
        delete: Effect.fn("TodoService.delete")(function* ({ id }: { readonly id: string }) {
          return yield* repository.delete({ id });
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<TodoService, never, TodoRepository> = Layer.effect(
    TodoService,
  )(TodoService.make);
}
