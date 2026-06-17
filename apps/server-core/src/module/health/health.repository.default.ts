import { sql } from "drizzle-orm";
import { Clock, Context, Effect, Layer } from "effect";
import { Database } from "@/platform/database.interface.ts";

export class HealthRepository extends Context.Service<HealthRepository>()(
  "cherelynnandkevin/server-core/module/health/HealthRepository",
  {
    make: Effect.gen(function* () {
      const { db } = yield* Database;

      return {
        checkPostgres: Effect.fn("HealthRepository.checkPostgres")(function* () {
          const startedAt = yield* Clock.currentTimeMillis;
          const isAvailable = yield* db.execute(sql`select 1`).pipe(
            Effect.as(true),
            Effect.catch(() => Effect.succeed(false)),
          );

          if (!isAvailable) {
            return {
              status: "down" as const,
              error: "postgres health check failed",
            };
          }

          const finishedAt = yield* Clock.currentTimeMillis;
          return {
            status: "ok" as const,
            latencyMs: finishedAt - startedAt,
          };
        })(),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<HealthRepository, never, Database> = Layer.effect(
    HealthRepository,
  )(HealthRepository.make);
}
