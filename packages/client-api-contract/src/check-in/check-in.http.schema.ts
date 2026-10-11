import { Schema } from "effect";

export const RsvpAuthenticateRequestSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.String,
});

export const RsvpAuthenticateResponseSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  attending: Schema.Literals(["", "Yes", "No"]),
  email: Schema.String,
  notes: Schema.String,
});

export const RsvpRespondRequestSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.String,
  attending: Schema.Literals(["Yes", "No"]),
  email: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(254),
    Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  ),
  notes: Schema.String.check(Schema.isMaxLength(1000)),
});

export const RsvpResponseSchema = Schema.Struct({
  id: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  attending: Schema.Literals(["Yes", "No"]),
  email: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(254),
    Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  ),
  notes: Schema.String.check(Schema.isMaxLength(1000)),
  spreadsheetStatus: Schema.Literal("updated"),
});

export type RsvpAuthenticateRequest = typeof RsvpAuthenticateRequestSchema.Type;
export type RsvpAuthenticateResponse = typeof RsvpAuthenticateResponseSchema.Type;
export type RsvpRespondRequest = typeof RsvpRespondRequestSchema.Type;
export type RsvpResponse = typeof RsvpResponseSchema.Type;
