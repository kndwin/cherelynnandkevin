import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";
import {
  RsvpAuthenticateRequestSchema,
  RsvpAuthenticateResponseSchema,
  RsvpRespondRequestSchema,
  RsvpResponseSchema,
} from "./check-in.http.schema.ts";

export {
  RsvpAuthenticateRequestSchema,
  RsvpAuthenticateResponseSchema,
  RsvpRespondRequestSchema,
  RsvpResponseSchema,
} from "./check-in.http.schema.ts";

const RsvpApiErrors = [
  HttpApiError.UnauthorizedNoContent,
  HttpApiError.ForbiddenNoContent,
  HttpApiError.BadRequestNoContent,
  HttpApiError.InternalServerErrorNoContent,
] as const;

export const CheckInHttpGroup = HttpApiGroup.make("checkIn")
  .add(
    HttpApiEndpoint.post("authenticate", "/rsvps/authenticate", {
      payload: RsvpAuthenticateRequestSchema,
      success: RsvpAuthenticateResponseSchema,
      error: RsvpApiErrors,
    }),
  )
  .add(
    HttpApiEndpoint.post("respond", "/rsvps", {
      payload: RsvpRespondRequestSchema,
      success: RsvpResponseSchema,
      error: RsvpApiErrors,
    }),
  );

export const CheckInHttpApi = HttpApi.make("CheckInHttpApi").add(CheckInHttpGroup);

export type {
  RsvpAuthenticateRequest,
  RsvpAuthenticateResponse,
  RsvpRespondRequest,
  RsvpResponse,
} from "./check-in.http.schema.ts";
