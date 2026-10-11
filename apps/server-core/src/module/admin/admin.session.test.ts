import { describe, expect, it } from "vitest";
import {
  adminPasswordsEqual,
  signAdminSession,
  verifyAdminSession,
} from "./admin.session.ts";

const secret = "test-admin-password";

describe("admin session cookie", () => {
  it("round-trips a signed session", () => {
    const nowMs = Date.now();
    const cookie = signAdminSession({ secret, nowMs });
    expect(verifyAdminSession({ secret, cookieValue: cookie, nowMs })).toBe(true);
  });

  it("rejects the wrong secret", () => {
    const nowMs = Date.now();
    const cookie = signAdminSession({ secret, nowMs });
    expect(verifyAdminSession({ secret: "another-secret", cookieValue: cookie, nowMs })).toBe(false);
  });

  it("rejects expired sessions", () => {
    const issuedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const cookie = signAdminSession({ secret, nowMs: issuedAt });
    expect(verifyAdminSession({ secret, cookieValue: cookie, nowMs: Date.now() })).toBe(false);
  });

  it("rejects tampered or malformed cookies without throwing", () => {
    const nowMs = Date.now();
    const valid = signAdminSession({ secret, nowMs });
    const [expiry, signature] = valid.split(".");
    expect(
      verifyAdminSession({ secret, cookieValue: `${expiry}.${"0".repeat(64)}`, nowMs }),
    ).toBe(false);
    expect(
      verifyAdminSession({ secret, cookieValue: `${signature}`, nowMs }),
    ).toBe(false);
    for (const malformed of [undefined, "", "abc", "1.2.3", "notanumber.deadbeef", `${expiry}.xyz`]) {
      expect(verifyAdminSession({ secret, cookieValue: malformed, nowMs })).toBe(false);
    }
  });

  it("treats a missing server secret as disabled", () => {
    const cookie = signAdminSession({ secret, nowMs: Date.now() });
    expect(verifyAdminSession({ secret: "", cookieValue: cookie, nowMs: Date.now() })).toBe(false);
  });
});

describe("adminPasswordsEqual", () => {
  it("accepts the exact password and rejects others", () => {
    expect(adminPasswordsEqual("correct horse", "correct horse")).toBe(true);
    expect(adminPasswordsEqual("Correct horse", "correct horse")).toBe(false);
    expect(adminPasswordsEqual("", "correct horse")).toBe(false);
    expect(adminPasswordsEqual("correct horse", "")).toBe(false);
  });
});
