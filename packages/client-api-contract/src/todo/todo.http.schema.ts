import { Schema } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

export const TodoSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const TodoListResponseSchema = Schema.Array(TodoSchema);

export const TodoListQuerySchema = Schema.Struct({
  page: Schema.optional(Schema.NumberFromString),
  pageSize: Schema.optional(Schema.NumberFromString),
  completed: Schema.optional(Schema.Literals(["true", "false"])),
  title: Schema.optional(Schema.String),
});

export const TodoGetParamsSchema = Schema.Struct({
  id: Schema.String,
});

export const TodoCreateRequestSchema = Schema.Struct({
  title: Schema.String,
});

export const TodoUpdateRequestSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  completed: Schema.optional(Schema.Boolean),
});

export const TodoDeleteResponseSchema = Schema.Struct({
  id: Schema.String,
});

export class TodoNotFoundHttpError extends Schema.TaggedErrorClass<TodoNotFoundHttpError>()(
  "TodoNotFoundHttpError",
  {
    id: Schema.String,
  },
) {}

export const TodoNotFoundHttpErrorSchema = TodoNotFoundHttpError.pipe(HttpApiSchema.status(404));

export type Todo = typeof TodoSchema.Type;
export type TodoListQuery = typeof TodoListQuerySchema.Type;
export type TodoListResponse = typeof TodoListResponseSchema.Type;
export type TodoGetParams = typeof TodoGetParamsSchema.Type;
export type TodoCreateRequest = typeof TodoCreateRequestSchema.Type;
export type TodoUpdateRequest = typeof TodoUpdateRequestSchema.Type;
export type TodoDeleteResponse = typeof TodoDeleteResponseSchema.Type;
