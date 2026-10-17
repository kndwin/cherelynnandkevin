import { randomUUID } from "node:crypto";

const rawAdminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (process.env.SAO_ALLOW_TESTS !== "1") throw new Error("SAO_ALLOW_TESTS=1 is required");
if (!rawAdminUrl) throw new Error("TEST_DATABASE_ADMIN_URL is required (localhost only)");
const adminUrl = new URL(rawAdminUrl);
if (!["localhost", "127.0.0.1", "[::1]"].includes(adminUrl.hostname)) throw new Error("Disposable tests require a localhost administrative connection");
const name = `cak_test_${randomUUID().replaceAll("-", "")}`;
if (!/^cak_test_[0-9a-f]{32}$/.test(name)) throw new Error("Invalid generated test database name");
const testUrl = new URL(adminUrl);
testUrl.pathname = `/${name}`;
const admin = new Bun.SQL(rawAdminUrl);
let created = false;
let exitCode = 1;
const env = { ...process.env, DATABASE_URL: testUrl.toString(), SAO_ALLOW_TESTS: "1", SAO_DISPOSABLE_DB: "1",
  RSVP_EMAIL_ENABLED: "false", CLOUDFLARE_EMAIL_API_TOKEN: "",
  ADMIN_PASSWORD: "disposable-test-admin", GOOGLE_SERVICE_ACCOUNT_EMAIL: "", GOOGLE_PRIVATE_KEY: "", GOOGLE_SHEETS_SPREADSHEET_ID: "" };
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  console.log(`Created disposable test database ${name}`);
  const migrate = Bun.spawn(["bun", "src/platform/database.migrate.ts"], { cwd: new URL("..", import.meta.url).pathname, env, stdout: "inherit", stderr: "inherit" });
  if (await migrate.exited !== 0) throw new Error("Disposable database migrations failed");
  const rerun = Bun.spawn(["bun", "src/platform/database.migrate.ts"], { cwd: new URL("..", import.meta.url).pathname, env, stdout: "inherit", stderr: "inherit" });
  if (await rerun.exited !== 0) throw new Error("Disposable database migration rerun failed");
  // Existing repository pagination tests exercise the deterministic seed.
  const seed = Bun.spawn(["bun", "src/platform/database.seed.ts"], { cwd: new URL("..", import.meta.url).pathname, env, stdout: "inherit", stderr: "inherit" });
  if (await seed.exited !== 0) throw new Error("Disposable database seeding failed");
  const tests = Bun.spawn(["pnpm", "test"], { cwd: new URL("..", import.meta.url).pathname, env, stdout: "inherit", stderr: "inherit" });
  exitCode = await tests.exited;
} catch {
  console.error("Disposable database setup/test execution failed (connection details suppressed)");
} finally {
  // Drop ONLY a database successfully created by THIS invocation. Never reuse
  // or clean an existing user database, singleton control or cluster tables.
  if (created) {
    await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    console.log(`Dropped disposable test database ${name}`);
  }
  await admin.close();
}
process.exitCode = exitCode;
