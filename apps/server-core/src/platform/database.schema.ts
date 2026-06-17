import { Schema } from "effect";

export const DatabaseConfigSchema = Schema.Struct({
  url: Schema.String,
});

export type DatabaseConfig = typeof DatabaseConfigSchema.Type;
