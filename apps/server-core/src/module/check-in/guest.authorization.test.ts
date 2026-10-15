import { Effect, Logger } from "effect";
import { HttpApiError } from "effect/unstable/httpapi";
import { describe, expect, it, vi } from "vitest";
import { makeGuestAuthorizer } from "./guest.authorization.ts";

const names = { firstName: "  Example  ", lastName: "  GUEST " };

describe("best-effort failed authentication recording", () => {
  it("records only normalized name and reason, never credentials or the full payload", async () => {
    const record = vi.fn(() => Effect.void);
    const classify = vi.fn(() => Effect.succeed("name-not-found" as const));
    const authorize = makeGuestAuthorizer({ classify, record });
    const error = await Effect.runPromise(authorize({ ...names, sitePassword: "do-not-store-this" }).pipe(Effect.flip));
    expect(error).toBeInstanceOf(HttpApiError.Forbidden);
    expect(record).toHaveBeenCalledExactlyOnceWith({ normalizedName: "example guest", reason: "name-not-found" });
    expect(classify).toHaveBeenCalledExactlyOnceWith(names);
    expect(JSON.stringify(record.mock.calls)).not.toContain("do-not-store-this");
  });
  it("retains the normal auth error when recording fails, defects, or stalls", async () => {
    const log = vi.fn();
    const logger = Logger.layer([Logger.make(log)]);
    for (const failure of [Effect.fail(new Error("do-not-store-this recorder error")), Effect.die("do-not-store-this recorder defect"), Effect.never]) {
      const record = vi.fn(() => failure);
      const authorize = makeGuestAuthorizer({ classify: () => Effect.succeed("ineligible"), record });
      expect(await Effect.runPromise(authorize(names).pipe(Effect.flip, Effect.provide(logger)))).toBeInstanceOf(HttpApiError.Forbidden);
      expect(record).toHaveBeenCalledTimes(1);
    }
    expect(log).not.toHaveBeenCalled();
  });
  it("records lookup denials once, but neither infrastructure errors nor successful auth", async () => {
    for (const reason of ["name-not-found", "ineligible"] as const) {
      const record = vi.fn(() => Effect.fail("recorder unavailable"));
      const classify = vi.fn(() => Effect.succeed(reason));
      const authorize = makeGuestAuthorizer({ classify, record });
      expect(await Effect.runPromise(authorize({ ...names, sitePassword: "kc27" }).pipe(Effect.flip))).toBeInstanceOf(HttpApiError.Forbidden);
      expect(classify).toHaveBeenCalledExactlyOnceWith(names);
      expect(record).toHaveBeenCalledExactlyOnceWith({ normalizedName: "example guest", reason });
    }
    const record = vi.fn(() => Effect.void);
    const authorize = makeGuestAuthorizer({ classify: () => Effect.fail("database unavailable"), record });
    expect(await Effect.runPromise(authorize({ ...names, sitePassword: "kc27" }).pipe(Effect.flip))).toBeInstanceOf(HttpApiError.InternalServerError);
    await Effect.runPromise(makeGuestAuthorizer({ classify: () => Effect.succeed(null), record })({ ...names, sitePassword: "kc27" }));
    expect(record).not.toHaveBeenCalled();
  });
  it("does not truncate oversized names into misleading aggregates", async () => {
    const record = vi.fn(() => Effect.void);
    const authorize = makeGuestAuthorizer({ classify: () => Effect.succeed("name-not-found"), record });
    expect(await Effect.runPromise(authorize({ firstName: "a".repeat(401), lastName: "" }).pipe(Effect.flip))).toBeInstanceOf(HttpApiError.Forbidden);
    expect(record).not.toHaveBeenCalled();
  });
});
