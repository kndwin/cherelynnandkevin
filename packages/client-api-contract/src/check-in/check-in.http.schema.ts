import { Schema } from "effect";

const DietaryRequirementsSchema = Schema.optional(Schema.String.check(Schema.isMaxLength(1000)));

export const RsvpRevisionSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export const RelatedMemberSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  displayName: Schema.String,
  attending: Schema.Literals(["", "Yes", "No"]),
  rsvpRevision: RsvpRevisionSchema,
});
export const RelatedMembersResponseSchema = Schema.Struct({ members: Schema.Array(RelatedMemberSchema) });
export type RelatedMember = typeof RelatedMemberSchema.Type;
export type RelatedMembersResponse = typeof RelatedMembersResponseSchema.Type;
export const BehalfRsvpRequestSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.optional(Schema.String),
  targetId: Schema.String.check(Schema.isUUID()),
  attending: Schema.Literals(["Yes", "No"]),
  notes: Schema.optional(Schema.String.check(Schema.isMaxLength(1000))),
  dietaryRequirements: DietaryRequirementsSchema,
  expectedRevision: RsvpRevisionSchema,
});
export type BehalfRsvpRequest = typeof BehalfRsvpRequestSchema.Type;

export const RsvpAuthenticateRequestSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.optional(Schema.String),
});

export const RsvpAuthenticateResponseSchema = Schema.Struct({
  rsvpRevision: Schema.optional(RsvpRevisionSchema),
  firstName: Schema.String,
  lastName: Schema.String,
  attending: Schema.Literals(["", "Yes", "No"]),
  email: Schema.String,
  notes: Schema.String,
  dietaryRequirements: DietaryRequirementsSchema,
});

export const RsvpRespondRequestSchema = Schema.Struct({
  expectedRevision: RsvpRevisionSchema,
  firstName: Schema.String,
  lastName: Schema.String,
  sitePassword: Schema.optional(Schema.String),
  attending: Schema.Literals(["Yes", "No"]),
  email: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(254),
    Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  ),
  notes: Schema.String.check(Schema.isMaxLength(1000)),
  dietaryRequirements: DietaryRequirementsSchema,
});

export const RsvpResponseSchema = Schema.Struct({
  rsvpRevision: Schema.optional(RsvpRevisionSchema),
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
  dietaryRequirements: DietaryRequirementsSchema,
  // Keep the historical success value decodable for older servers, while
  // distinguishing pending work and an unavailable spreadsheet integration.
  spreadsheetStatus: Schema.Literals(["updated", "queued", "not-configured"]),
});

export type RsvpAuthenticateRequest = typeof RsvpAuthenticateRequestSchema.Type;
export type RsvpAuthenticateResponse = typeof RsvpAuthenticateResponseSchema.Type;
export type RsvpRespondRequest = typeof RsvpRespondRequestSchema.Type;
export type RsvpResponse = typeof RsvpResponseSchema.Type;
