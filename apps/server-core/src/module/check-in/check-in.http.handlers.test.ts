import { describe, expect, it } from "vitest";
import { HttpApiError } from "effect/unstable/httpapi";
import { toAuthorizeHttpError } from "./check-in.http.handlers.ts";
import { CheckinGuestNotFoundError } from "./guest.schema.ts";

describe("toAuthorizeHttpError", () => {
  it("maps an absent/ineligible guest to 403", () => {
    const result = toAuthorizeHttpError(new CheckinGuestNotFoundError({}));
    expect(result).toBeInstanceOf(HttpApiError.Forbidden);
  });

  it("maps infrastructure failures to 500, never 403", () => {
    for (const cause of [new Error("connection refused"), "boom", { status: 500 }, null]) {
      const result = toAuthorizeHttpError(cause);
      expect(result).toBeInstanceOf(HttpApiError.InternalServerError);
      expect(result).not.toBeInstanceOf(HttpApiError.Forbidden);
    }
  });
});
