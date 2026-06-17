import { Schema } from "effect";

export const CheckInCreateRequestSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.String,
  email: Schema.String,
});

export const CheckInResponseSchema = Schema.Struct({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  email: Schema.String,
  checkedInAt: Schema.String,
  spreadsheetStatus: Schema.Literal("mocked"),
});

export type CheckInCreateRequest = typeof CheckInCreateRequestSchema.Type;
export type CheckInResponse = typeof CheckInResponseSchema.Type;
