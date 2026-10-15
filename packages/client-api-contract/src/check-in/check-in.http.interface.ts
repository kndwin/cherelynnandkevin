import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";
import {
  BehalfRsvpRequestSchema, RelatedMemberSchema, RelatedMembersResponseSchema,
  RsvpAuthenticateRequestSchema,
  RsvpAuthenticateResponseSchema,
  RsvpRespondRequestSchema,
  RsvpResponseSchema,
} from "./check-in.http.schema.ts";

export {
  BehalfRsvpRequestSchema, RelatedMemberSchema, RelatedMembersResponseSchema,
  RsvpAuthenticateRequestSchema,
  RsvpAuthenticateResponseSchema,
  RsvpRespondRequestSchema,
  RsvpResponseSchema,
} from "./check-in.http.schema.ts";

const RsvpApiErrors = [
  HttpApiError.ConflictNoContent,
  HttpApiError.UnauthorizedNoContent,
  HttpApiError.ForbiddenNoContent,
  HttpApiError.BadRequestNoContent,
  HttpApiError.InternalServerErrorNoContent,
] as const;

export const CheckInHttpGroup = HttpApiGroup.make("checkIn")
  .add(HttpApiEndpoint.post("relatedMembers", "/rsvps/related", {
    payload: RsvpAuthenticateRequestSchema, success: RelatedMembersResponseSchema, error: RsvpApiErrors,
  }))
  .add(HttpApiEndpoint.post("respondBehalf", "/rsvps/behalf", {
    payload: BehalfRsvpRequestSchema, success: RelatedMemberSchema, error: RsvpApiErrors,
  }))
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
  BehalfRsvpRequest,
  RelatedMember, RelatedMembersResponse,
  RsvpAuthenticateRequest,
  RsvpAuthenticateResponse,
  RsvpRespondRequest,
  RsvpResponse,
} from "./check-in.http.schema.ts";
