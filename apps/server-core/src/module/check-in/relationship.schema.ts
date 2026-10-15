import { Schema } from "effect";

export class RsvpConflictError extends Schema.TaggedErrorClass<RsvpConflictError>()("RsvpConflictError", {}) {}
