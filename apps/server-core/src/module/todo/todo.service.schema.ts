import { Schema } from "effect";

export const TodoSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const TodoListResponseSchema = Schema.Array(TodoSchema);

export const TodoListSchema = Schema.Struct({
  page: Schema.optional(Schema.Number),
  pageSize: Schema.optional(Schema.Number),
  completed: Schema.optional(Schema.Boolean),
  title: Schema.optional(Schema.String),
});

export const TodoCreateSchema = Schema.Struct({
  title: Schema.String,
});

export const TodoUpdateSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  completed: Schema.optional(Schema.Boolean),
});

export const TodoDeleteResponseSchema = Schema.Struct({
  id: Schema.String,
});

export class TodoServiceError extends Schema.TaggedErrorClass<TodoServiceError>()(
  "TodoServiceError",
  {
    message: Schema.String,
    cause: Schema.Defect,
  },
) {}
