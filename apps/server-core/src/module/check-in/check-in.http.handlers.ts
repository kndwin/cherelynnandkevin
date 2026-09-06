import { CheckInHttpApi } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { CheckInService } from "@/module/check-in/check-in.service.default.ts";
import { GuestAllowlist } from "@/module/check-in/guest-allowlist.service.ts";

const SITE_PASSWORD = "kc27";

export const CheckInHttpHandlersLive = HttpApiBuilder.group(
  CheckInHttpApi,
  "checkIn",
  Effect.fnUntraced(function* (handlers) {
    const checkIn = yield* CheckInService;
    const allowlist = yield* GuestAllowlist;

    return handlers.handle("create", ({ payload }) =>
      Effect.gen(function* () {
        if (payload.sitePassword !== SITE_PASSWORD) {
          return yield* Effect.fail(new HttpApiError.Unauthorized({}));
        }

        const allowed = yield* allowlist
          .isAllowed({ firstName: payload.firstName, lastName: payload.lastName })
          .pipe(Effect.mapError(() => new HttpApiError.InternalServerError({})));
        if (!allowed) {
          return yield* Effect.fail(new HttpApiError.Forbidden({}));
        }

        return yield* checkIn
          .create({ input: payload })
          .pipe(Effect.mapError(() => new HttpApiError.InternalServerError({})));
      }),
    );
  }),
);
