import { Schema } from "effect";

export class GooglePrivateKeyError extends Schema.TaggedErrorClass<GooglePrivateKeyError>()(
  "GooglePrivateKeyError",
  {
    cause: Schema.Defect,
  },
) {}

export class GoogleJwtSignError extends Schema.TaggedErrorClass<GoogleJwtSignError>()(
  "GoogleJwtSignError",
  {
    cause: Schema.Defect,
  },
) {}

export class GoogleOAuthRequestError extends Schema.TaggedErrorClass<GoogleOAuthRequestError>()(
  "GoogleOAuthRequestError",
  {
    cause: Schema.Defect,
  },
) {}

export class GoogleOAuthError extends Schema.TaggedErrorClass<GoogleOAuthError>()("GoogleOAuthError", {
  status: Schema.Number,
  body: Schema.String,
}) {}

export class GoogleTokenResponseError extends Schema.TaggedErrorClass<GoogleTokenResponseError>()(
  "GoogleTokenResponseError",
  {
    body: Schema.String,
  },
) {}

export class GoogleSheetsRequestError extends Schema.TaggedErrorClass<GoogleSheetsRequestError>()(
  "GoogleSheetsRequestError",
  {
    cause: Schema.Defect,
  },
) {}

export class GoogleSheetsError extends Schema.TaggedErrorClass<GoogleSheetsError>()("GoogleSheetsError", {
  status: Schema.Number,
  body: Schema.String,
}) {}

export class GoogleSheetsResponseError extends Schema.TaggedErrorClass<GoogleSheetsResponseError>()(
  "GoogleSheetsResponseError",
  {
    cause: Schema.Defect,
  },
) {}

export type GuestAllowlistError =
  | GooglePrivateKeyError
  | GoogleJwtSignError
  | GoogleOAuthRequestError
  | GoogleOAuthError
  | GoogleTokenResponseError
  | GoogleSheetsRequestError
  | GoogleSheetsError
  | GoogleSheetsResponseError;
