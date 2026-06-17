import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { HealthLiveResponseSchema, HealthReadyResponseSchema } from "./health.http.schema.ts";

export const HealthHttpGroup = HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("live", "/live", {
      success: HealthLiveResponseSchema,
    }),
  )
  .add(
    HttpApiEndpoint.get("ready", "/ready", {
      success: HealthReadyResponseSchema,
    }),
  );

export const HealthHttpApi = HttpApi.make("HealthHttpApi").add(HealthHttpGroup);

export type {
  HealthComponent,
  HealthLiveResponse,
  HealthReadyResponse,
  HealthStatus,
} from "./health.http.schema.ts";
