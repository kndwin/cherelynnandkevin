import { Context, Effect, Layer } from "effect";
import { HealthRepository } from "@/module/health/health.repository.default.ts";

export class HealthService extends Context.Service<HealthService>()(
  "cherelynnandkevin/server-core/module/health/HealthService",
  {
    make: Effect.gen(function* () {
      const repository = yield* HealthRepository;

      return {
        live: Effect.fn("HealthService.live")(function* () {
          return yield* Effect.succeed({ status: "ok" as const });
        })(),
        ready: Effect.fn("HealthService.ready")(function* () {
          const checks = yield* Effect.all({
            postgres: repository.checkPostgres,
          });

          return {
            status: checks.postgres.status,
            checks,
          };
        })(),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<HealthService, never, HealthRepository> = Layer.effect(
    HealthService,
  )(HealthService.make);
}
