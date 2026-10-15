import { describe, expect, it } from "vitest";
import { hasDisposableTestDatabase } from "./test-database.guard.ts";

describe("disposable database safety guard", () => {
  const valid = { DATABASE_URL: "postgres://localhost/cak_test_0123456789abcdef0123456789abcdef", SAO_ALLOW_TESTS: "1", SAO_DISPOSABLE_DB: "1" };
  it("allows explicit disposable localhost databases and skips absent database config", () => {
    expect(hasDisposableTestDatabase(valid)).toBe(true);
    expect(hasDisposableTestDatabase({})).toBe(false);
  });
  it("rejects shared local databases, non-local hosts, unsafe names and missing opt-ins", () => {
    for (const env of [
      { ...valid, DATABASE_URL: "postgres://localhost/cherelynnandkevin" },
      { ...valid, DATABASE_URL: "postgres://remote.example/cak_test_0123456789abcdef0123456789abcdef" },
      { ...valid, DATABASE_URL: "postgres://localhost/cak_test_user_database" },
      { ...valid, SAO_ALLOW_TESTS: "" }, { ...valid, SAO_DISPOSABLE_DB: "" },
    ]) expect(() => hasDisposableTestDatabase(env)).toThrow("disposable localhost");
  });
});
