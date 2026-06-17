import { TodoHttpApi, TodoNotFoundHttpError } from "@cherelynnandkevin/client-api-contract/todo/http";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { TodoService } from "@/module/todo/todo.service.default.ts";

const toTodoHttpError = (error: { readonly _tag: string; readonly id?: string }) =>
  error._tag === "TodoNotFoundError" && error.id !== undefined
    ? new TodoNotFoundHttpError({ id: error.id })
    : new HttpApiError.InternalServerError({});

export const TodoHttpHandlersLive = HttpApiBuilder.group(
  TodoHttpApi,
  "todo",
  Effect.fnUntraced(function* (handlers) {
    const todo = yield* TodoService;

    return handlers
      .handle("list", ({ query }) =>
        todo
          .list({
            input: {
              ...query,
              completed: query.completed === undefined ? undefined : query.completed === "true",
            },
          })
          .pipe(Effect.mapError(() => new HttpApiError.InternalServerError({}))),
      )
      .handle("get", ({ params }) => todo.get({ id: params.id }).pipe(Effect.mapError(toTodoHttpError)))
      .handle("create", ({ payload }) =>
        todo
          .create({ input: payload })
          .pipe(Effect.mapError(() => new HttpApiError.InternalServerError({}))),
      )
      .handle("update", ({ params, payload }) =>
        todo.update({ id: params.id, input: payload }).pipe(Effect.mapError(toTodoHttpError)),
      )
      .handle("delete", ({ params }) =>
        todo.delete({ id: params.id }).pipe(Effect.mapError(toTodoHttpError)),
      );
  }),
);
