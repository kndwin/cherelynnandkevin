import { Layer } from "effect";
import { HealthHttpHandlersLive } from "@/module/health/health.http.handlers.ts";
import { HealthRepository } from "@/module/health/health.repository.default.ts";
import { HealthService } from "@/module/health/health.service.default.ts";

const HealthServiceProvidedLive = HealthService.layer.pipe(Layer.provide(HealthRepository.layer));

export const HealthModuleLive = HealthHttpHandlersLive.pipe(
  Layer.provide(HealthServiceProvidedLive),
);
