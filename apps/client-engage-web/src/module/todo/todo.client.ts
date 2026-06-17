import type { TodoCreateRequest, TodoListQuery, TodoUpdateRequest } from "@cherelynnandkevin/client-api-contract/todo/http";
import { AppHttpClient } from "@/platform/http.client.ts";
import { Context, Effect, Layer } from "effect";

export class TodoClient extends Context.Service<TodoClient>()(
  "cherelynnandkevin/web/module/todo/TodoClient",
  {
    make: Effect.gen(function* () {
      const http = yield* AppHttpClient;

      return {
        list: (query: TodoListQuery = {}) => http.todo.list({ query }),
        create: (payload: TodoCreateRequest) => http.todo.create({ payload }),
        update: (id: string, payload: TodoUpdateRequest) => http.todo.update({ params: { id }, payload }),
        delete: (id: string) => http.todo.delete({ params: { id } }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<TodoClient> = Layer.effect(TodoClient)(TodoClient.make).pipe(
    Layer.provide(AppHttpClient.layer),
  );
}
