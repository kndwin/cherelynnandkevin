import { HttpApi } from "effect/unstable/httpapi";
import type { HttpApiClient } from "effect/unstable/httpapi";
import { CheckInHttpGroup } from "../check-in/check-in.http.interface.ts";
import { HealthHttpGroup } from "../health/health.http.interface.ts";
import { TodoHttpGroup } from "../todo/todo.http.interface.ts";

export const ClientHttpApi = HttpApi.make("ClientHttpApi")
  .add(HealthHttpGroup)
  .add(TodoHttpGroup)
  .add(CheckInHttpGroup);

export type ClientHttpApiClient = HttpApiClient.ForApi<typeof ClientHttpApi>;
