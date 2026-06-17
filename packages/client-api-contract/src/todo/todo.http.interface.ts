import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";
import {
  TodoCreateRequestSchema,
  TodoDeleteResponseSchema,
  TodoGetParamsSchema,
  TodoListQuerySchema,
  TodoListResponseSchema,
  TodoNotFoundHttpErrorSchema,
  TodoSchema,
  TodoUpdateRequestSchema,
} from "./todo.http.schema.ts";

export { TodoNotFoundHttpError } from "./todo.http.schema.ts";
export {
  TodoCreateRequestSchema,
  TodoDeleteResponseSchema,
  TodoGetParamsSchema,
  TodoListQuerySchema,
  TodoListResponseSchema,
  TodoNotFoundHttpErrorSchema,
  TodoSchema,
  TodoUpdateRequestSchema,
} from "./todo.http.schema.ts";

export const TodoHttpGroup = HttpApiGroup.make("todo")
  .add(
    HttpApiEndpoint.get("list", "/todos", {
      query: TodoListQuerySchema.fields,
      success: TodoListResponseSchema,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .add(
    HttpApiEndpoint.get("get", "/todos/:id", {
      params: TodoGetParamsSchema.fields,
      success: TodoSchema,
      error: [TodoNotFoundHttpErrorSchema, HttpApiError.InternalServerErrorNoContent],
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/todos", {
      payload: TodoCreateRequestSchema,
      success: TodoSchema,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .add(
    HttpApiEndpoint.patch("update", "/todos/:id", {
      params: TodoGetParamsSchema.fields,
      payload: TodoUpdateRequestSchema,
      success: TodoSchema,
      error: [TodoNotFoundHttpErrorSchema, HttpApiError.InternalServerErrorNoContent],
    }),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/todos/:id", {
      params: TodoGetParamsSchema.fields,
      success: TodoDeleteResponseSchema,
      error: [TodoNotFoundHttpErrorSchema, HttpApiError.InternalServerErrorNoContent],
    }),
  );

export const TodoHttpApi = HttpApi.make("TodoHttpApi").add(TodoHttpGroup);

export type {
  Todo,
  TodoCreateRequest,
  TodoDeleteResponse,
  TodoGetParams,
  TodoListQuery,
  TodoListResponse,
  TodoUpdateRequest,
} from "./todo.http.schema.ts";
