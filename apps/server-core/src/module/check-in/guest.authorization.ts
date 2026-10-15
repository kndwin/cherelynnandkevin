import type { FailedAuthReason } from "@cherelynnandkevin/client-api-contract/admin/http";
import { Effect } from "effect";
import { HttpApiError } from "effect/unstable/httpapi";
import { toGuestFullName } from "./guest-name.ts";

type Names = { readonly firstName: string; readonly lastName: string };
type RecordInput = { readonly normalizedName: string; readonly reason: FailedAuthReason };

// Dependencies only accept names or the minimal failure DTO, never credentials.
export const makeGuestAuthorizer = (dependencies: {
  readonly classify: (names: Names) => Effect.Effect<"name-not-found" | "ineligible" | null, unknown>;
  readonly record: (input: RecordInput) => Effect.Effect<void, unknown>;
}) => (input: Names & { readonly sitePassword?: string | undefined }) => Effect.gen(function* () {
  const record = (reason: FailedAuthReason) => {
    const normalizedName = toGuestFullName(input.firstName, input.lastName);
    // Existing public name schemas are unbounded. Oversized attempts must not
    // collide through truncation or grow the operations store without bounds.
    if (normalizedName.length > 400) return Effect.void;
    return Effect.suspend(() => dependencies.record({ normalizedName, reason })).pipe(
      Effect.timeout("500 millis"),
      Effect.catchCause(() => Effect.void),
    );
  };
  // A database/decoding failure is infrastructure failure, not an attempt reason.
  const reason = yield* dependencies.classify({ firstName: input.firstName, lastName: input.lastName }).pipe(
    Effect.mapError(() => new HttpApiError.InternalServerError({})),
  );
  if (reason !== null) {
    yield* record(reason);
    return yield* new HttpApiError.Forbidden({});
  }
});
