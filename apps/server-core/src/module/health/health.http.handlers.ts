import { HealthHttpApi } from "@cherelynnandkevin/client-api-contract/health/http";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { HealthService } from "@/module/health/health.service.default.ts";

export const HealthHttpHandlersLive = HttpApiBuilder.group(
  HealthHttpApi,
  "health",
  Effect.fnUntraced(function* (handlers) {
    const health = yield* HealthService;

    return handlers.handle("live", () => health.live).handle("ready", () => health.ready);
  }),
);
