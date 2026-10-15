// Only the disposable runner's uniquely named databases may be mutated by tests.
export const hasDisposableTestDatabase = (env: Readonly<Record<string, string | undefined>> = process.env): boolean => {
  if (!env.DATABASE_URL) return false;
  const url = new URL(env.DATABASE_URL);
  if (env.SAO_ALLOW_TESTS !== "1" || env.SAO_DISPOSABLE_DB !== "1"
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !/^\/cak_test_[0-9a-f]{32}$/.test(url.pathname)) {
    throw new Error("Database tests require a disposable localhost cak_test_<32 hex> database, SAO_ALLOW_TESTS=1 and SAO_DISPOSABLE_DB=1; use pnpm test:disposable");
  }
  return true;
};
