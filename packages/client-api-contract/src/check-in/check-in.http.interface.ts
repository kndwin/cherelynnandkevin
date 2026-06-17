import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";
import { CheckInCreateRequestSchema, CheckInResponseSchema } from "./check-in.http.schema.ts";

export { CheckInCreateRequestSchema, CheckInResponseSchema } from "./check-in.http.schema.ts";

export const CheckInHttpGroup = HttpApiGroup.make("checkIn").add(
  HttpApiEndpoint.post("create", "/check-ins", {
    payload: CheckInCreateRequestSchema,
    success: CheckInResponseSchema,
    error: Schema.Union([HttpApiError.UnauthorizedNoContent, HttpApiError.InternalServerErrorNoContent]),
  }),
);

export const CheckInHttpApi = HttpApi.make("CheckInHttpApi").add(CheckInHttpGroup);

export type { CheckInCreateRequest, CheckInResponse } from "./check-in.http.schema.ts";
