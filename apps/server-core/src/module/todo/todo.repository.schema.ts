import { Schema } from "effect";

export class TodoNotFoundError extends Schema.TaggedErrorClass<TodoNotFoundError>()(
  "TodoNotFoundError",
  {
    id: Schema.String,
  },
) {}
