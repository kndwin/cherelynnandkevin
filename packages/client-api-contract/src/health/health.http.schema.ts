import { Schema } from "effect";

export const HealthStatusSchema = Schema.Literals(["ok", "degraded", "down"]);

export const HealthComponentSchema = Schema.Struct({
  status: HealthStatusSchema,
  latencyMs: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
});

export const HealthLiveResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
});

export const HealthReadyResponseSchema = Schema.Struct({
  status: HealthStatusSchema,
  checks: Schema.Struct({
    postgres: HealthComponentSchema,
  }),
});

export type HealthStatus = typeof HealthStatusSchema.Type;
export type HealthComponent = typeof HealthComponentSchema.Type;
export type HealthLiveResponse = typeof HealthLiveResponseSchema.Type;
export type HealthReadyResponse = typeof HealthReadyResponseSchema.Type;
