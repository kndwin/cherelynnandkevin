import { Schema } from "effect";

export class CheckinGuestNotFoundError extends Schema.TaggedErrorClass<CheckinGuestNotFoundError>()(
  "CheckinGuestNotFoundError",
  {},
) {}

export class GuestValidationError extends Schema.TaggedErrorClass<GuestValidationError>()(
  "GuestValidationError",
  {
    message: Schema.String,
  },
) {}

export type GuestRepositoryError = CheckinGuestNotFoundError | GuestValidationError;
