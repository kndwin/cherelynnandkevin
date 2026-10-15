import { CheckInHttpApi } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { CheckInService } from "@/module/check-in/check-in.service.default.ts";
import { CheckinGuestNotFoundError, GuestValidationError } from "@/module/check-in/guest.schema.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";
import { RsvpConflictError } from "./relationship.schema.ts";
import { OperationsRepository } from "@/module/admin/operations.repository.ts";
import { makeGuestAuthorizer } from "./guest.authorization.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;
const NOTES_MAX_LENGTH = 1000;

const isValidEmail = (value: string): boolean =>
  value.length >= 1 && value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);

// 403 only for a successful lookup showing an absent/ineligible guest.
// Infrastructure and decoding failures propagate as 500.
const toAuthorizeHttpError = (error: unknown): HttpApiError.Unauthorized | HttpApiError.Forbidden | HttpApiError.InternalServerError =>
  error instanceof CheckinGuestNotFoundError
    ? new HttpApiError.Forbidden({})
    : new HttpApiError.InternalServerError({});

export const CheckInHttpHandlersLive = HttpApiBuilder.group(
  CheckInHttpApi,
  "checkIn",
  Effect.fnUntraced(function* (handlers) {
    const checkIn = yield* CheckInService;
    const guests = yield* GuestRepository;
    const operations = yield* OperationsRepository;
    const authorizeGuest = makeGuestAuthorizer({ classify: guests.authFailureReason, record: operations.recordFailure });

    return handlers
      .handle("relatedMembers", ({ payload }) => Effect.gen(function* () {
        yield* authorizeGuest(payload);
        return yield* guests.relatedMembers(payload).pipe(Effect.mapError(toAuthorizeHttpError));
      }))
      .handle("respondBehalf", ({ payload }) => Effect.gen(function* () {
        yield* authorizeGuest(payload);
        return yield* guests.saveBehalf({ input: payload }).pipe(Effect.mapError((error) =>
          error instanceof RsvpConflictError ? new HttpApiError.Conflict({}) :
          error instanceof GuestValidationError ? new HttpApiError.BadRequest({}) : toAuthorizeHttpError(error)));
      }))
      .handle("authenticate", ({ payload }) =>
        Effect.gen(function* () {
          yield* authorizeGuest({
            firstName: payload.firstName,
            lastName: payload.lastName,
            sitePassword: payload.sitePassword,
          });

          // Private RSVP values are fetched server-side only after password +
          // eligibility authorization. Missing guests surface as 403;
          // every other repository failure is a 500 and never leaks stored
          // values into logs.
          const stored = yield* checkIn
            .getRsvp({ firstName: payload.firstName, lastName: payload.lastName })
            .pipe(
              Effect.mapError((error) =>
                error instanceof CheckinGuestNotFoundError
                  ? new HttpApiError.Forbidden({})
                  : new HttpApiError.InternalServerError({}),
              ),
            );

          return {
            firstName: payload.firstName,
            lastName: payload.lastName,
            attending: stored.attending,
            email: stored.email,
            notes: stored.notes,
            rsvpRevision: stored.rsvpRevision,
          };
        }))
      .handle("respond", ({ payload }) =>
        Effect.gen(function* () {
          yield* authorizeGuest({
            firstName: payload.firstName,
            lastName: payload.lastName,
            sitePassword: payload.sitePassword,
          });

          const email = payload.email.trim();
          const notes = payload.notes.trim();
          if (!isValidEmail(email) || notes.length > NOTES_MAX_LENGTH) {
            return yield* new HttpApiError.BadRequest({});
          }

          return yield* checkIn.respond({ input: { ...payload, email, notes } }).pipe(
            Effect.mapError((error) =>
              error instanceof CheckinGuestNotFoundError
                ? new HttpApiError.Forbidden({})
                : error instanceof RsvpConflictError
                  ? new HttpApiError.Conflict({})
                : error instanceof GuestValidationError
                  ? new HttpApiError.BadRequest({})
                  : new HttpApiError.InternalServerError({}),
            ),
          );
        }));
  }),
);

export { toAuthorizeHttpError };
