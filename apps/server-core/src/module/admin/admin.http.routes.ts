import {
  AdminCreateGuestRequestSchema,
  AdminListGuestsQuerySchema,
  AdminLoginRequestSchema,
  AdminRoutes,
  AdminUpdateGuestRequestSchema,
} from "@cherelynnandkevin/client-api-contract/admin/http";
import { Config, Duration, Effect, Layer, Schema } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { CheckinGuestNotFoundError, GuestValidationError } from "@/module/check-in/guest.schema.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";
import {
  AdminSessionCookieName,
  AdminSessionTtlSeconds,
  adminPasswordsEqual,
  signAdminSession,
  verifyAdminSession,
} from "@/module/admin/admin.session.ts";

const AdminPasswordConfig = Config.string("ADMIN_PASSWORD").pipe(Config.withDefault(""));
const NodeEnvConfig = Config.string("NODE_ENV").pipe(Config.withDefault("development"));

type RouteFailure = HttpServerResponse.HttpServerResponse;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const badRequest = (message: string): RouteFailure =>
  HttpServerResponse.jsonUnsafe({ message }, { status: 400 });

const unauthorized = (): RouteFailure =>
  HttpServerResponse.jsonUnsafe({ message: "Unauthorized" }, { status: 401 });

const adminDisabled = (): RouteFailure =>
  HttpServerResponse.jsonUnsafe({ message: "Admin is not configured" }, { status: 503 });

const internalError = (): RouteFailure =>
  HttpServerResponse.jsonUnsafe({ message: "Internal server error" }, { status: 500 });

const toRouteFailure = (error: unknown): RouteFailure => {
  if (error instanceof CheckinGuestNotFoundError) {
    return HttpServerResponse.jsonUnsafe({ message: "Guest not found" }, { status: 404 });
  }
  if (error instanceof GuestValidationError) {
    return HttpServerResponse.jsonUnsafe({ message: error.message }, { status: 400 });
  }
  return internalError();
};

const readJsonBody = (request: {
  readonly json: Effect.Effect<unknown, unknown>;
}): Effect.Effect<unknown, RouteFailure> =>
  request.json.pipe(Effect.catch(() => Effect.fail(badRequest("Invalid request body"))));

// Route ids are parsed from the request URL (instead of RouteContext) so the
// handlers stay requirement-free. Only UUIDs reach the repository, so malformed
// ids fail fast as 400 instead of database errors.
const guestIdFromUrl = (url: string): string | undefined => {
  const id = (url.split("?")[0] ?? "").split("/").pop() ?? "";
  try {
    const decoded = decodeURIComponent(id);
    return UUID_PATTERN.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
};

export const AdminHttpRoutesLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const guests = yield* GuestRepository;
    const router = yield* HttpRouter.HttpRouter;
    const adminPassword = yield* AdminPasswordConfig;
    const nodeEnv = yield* NodeEnvConfig;

    const requireAuth = (
      cookies: Readonly<Record<string, string>>,
    ): Effect.Effect<void, RouteFailure> => {
      if (adminPassword.length === 0) {
        return Effect.fail(adminDisabled());
      }
      const ok = verifyAdminSession({
        secret: adminPassword,
        cookieValue: cookies[AdminSessionCookieName],
        nowMs: Date.now(),
      });
      return ok ? Effect.void : Effect.fail(unauthorized());
    };

    const respondJson = (
      body: unknown,
      status?: number,
    ): Effect.Effect<HttpServerResponse.HttpServerResponse, RouteFailure> =>
      HttpServerResponse.json(body, status === undefined ? undefined : { status }).pipe(
        Effect.mapError(() => internalError()),
      );

    // Login validates ADMIN_PASSWORD and issues an HttpOnly, Secure-in-
    // production, SameSite=Strict session cookie. The secret is never
    // returned, logged, or placed in URLs/localStorage.
    yield* router.add("POST", AdminRoutes.login, (request) =>
      Effect.gen(function* () {
        const json = yield* readJsonBody(request);
        const body = yield* Schema.decodeUnknownEffect(AdminLoginRequestSchema)(json).pipe(
          Effect.mapError(() => badRequest("Invalid request body")),
        );

        if (adminPassword.length === 0 || !adminPasswordsEqual(body.password, adminPassword)) {
          return yield* Effect.fail(unauthorized());
        }

        const session = signAdminSession({ secret: adminPassword, nowMs: Date.now() });
        const response = yield* respondJson({ ok: true as const });
        return yield* HttpServerResponse.setCookie(response, AdminSessionCookieName, session, {
          httpOnly: true,
          secure: nodeEnv === "production",
          sameSite: "strict",
          path: "/",
          maxAge: Duration.seconds(AdminSessionTtlSeconds),
        }).pipe(Effect.mapError(() => internalError()));
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );

    yield* router.add("POST", AdminRoutes.logout, () =>
      Effect.gen(function* () {
        const response = yield* respondJson({ ok: true as const });
        return yield* HttpServerResponse.expireCookie(response, AdminSessionCookieName, { path: "/" }).pipe(
          Effect.mapError(() => internalError()),
        );
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );

    yield* router.add("GET", AdminRoutes.guests, (request) =>
      Effect.gen(function* () {
        yield* requireAuth(request.cookies);
        const url = new URL(request.originalUrl, "http://localhost");
        const rawQuery: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          rawQuery[key] = value;
        });
        const query = yield* Schema.decodeUnknownEffect(AdminListGuestsQuerySchema)(rawQuery).pipe(
          Effect.mapError(() => badRequest("Invalid query")),
        );
        const result = yield* guests
          .adminList({
            input: {
              page: query.page,
              pageSize: query.pageSize,
              search: query.search,
              invitationStatus: query.invitationStatus,
              guestType: query.guestType,
              ownerKey: query.ownerKey,
            },
          })
          .pipe(Effect.mapError(toRouteFailure));
        return yield* respondJson(result);
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );

    yield* router.add("POST", AdminRoutes.guests, (request) =>
      Effect.gen(function* () {
        yield* requireAuth(request.cookies);
        const json = yield* readJsonBody(request);
        const body = yield* Schema.decodeUnknownEffect(AdminCreateGuestRequestSchema)(json).pipe(
          Effect.mapError(() => badRequest("Invalid request body")),
        );
        const created = yield* guests
          .adminCreate({
            input: {
              displayName: body.displayName,
              invitationStatus: body.invitationStatus,
              guestType: body.guestType,
              ownerKey: body.ownerKey,
              internalNotes: body.internalNotes,
            },
          })
          .pipe(Effect.mapError(toRouteFailure));
        return yield* respondJson(created, 201);
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );

    yield* router.add("PATCH", "/admin/guests/:id", (request) =>
      Effect.gen(function* () {
        yield* requireAuth(request.cookies);
        const id = guestIdFromUrl(request.url);
        if (id === undefined) {
          return yield* Effect.fail(badRequest("Invalid guest id"));
        }
        const json = yield* readJsonBody(request);
        const body = yield* Schema.decodeUnknownEffect(AdminUpdateGuestRequestSchema)(json).pipe(
          Effect.mapError(() => badRequest("Invalid request body")),
        );
        const updated = yield* guests
          .adminUpdate({
            id,
            input: {
              displayName: body.displayName,
              invitationStatus: body.invitationStatus,
              guestType: body.guestType,
              ownerKey: body.ownerKey,
              internalNotes: body.internalNotes,
              rsvpStatus: body.rsvpStatus,
              rsvpEmail: body.rsvpEmail,
              rsvpNotes: body.rsvpNotes,
            },
          })
          .pipe(Effect.mapError(toRouteFailure));
        return yield* respondJson(updated);
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );

    yield* router.add("DELETE", "/admin/guests/:id", (request) =>
      Effect.gen(function* () {
        yield* requireAuth(request.cookies);
        const id = guestIdFromUrl(request.url);
        if (id === undefined) {
          return yield* Effect.fail(badRequest("Invalid guest id"));
        }
        const deleted = yield* guests.adminDelete({ id }).pipe(Effect.mapError(toRouteFailure));
        return yield* respondJson(deleted);
      }).pipe(Effect.catch((failure) => Effect.succeed(failure))),
    );
  }),
);
