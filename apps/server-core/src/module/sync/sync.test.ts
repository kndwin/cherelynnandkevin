import { PgClient } from "@effect/sql-pg";
import { randomUUID } from "node:crypto";
import { ConfigProvider, Cron, Deferred, Effect, Fiber, Layer, Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { SheetsSyncConfig } from "./sync.config.ts";
import { SyncBusyError, SyncNotConfiguredError, SyncRepository, SnapshotHeaders } from "./sync.repository.ts";
import { DurableSyncEngineLive, HourlySydney, latestDueHour, SheetsSyncLive, SheetsSyncService } from "./sync.service.ts";
import { SheetsWriter } from "./sheets.writer.ts";
import { SheetsSyncWorkflow, SheetsSyncWorkflowLive } from "./sync.workflow.ts";
import { hasDisposableTestDatabase } from "@/platform/test-database.guard.ts";

const hasDatabase = hasDisposableTestDatabase();
const repositoryLive = SyncRepository.layer.pipe(Layer.provide(DatabaseLive));
const run = <A, E>(f: (repo: SyncRepository["Service"]) => Effect.Effect<A, E>) => Effect.runPromise(SyncRepository.pipe(Effect.flatMap(f), Effect.provide(repositoryLive)));
const runSql = <A, E>(f: (sql: PgClient.PgClient) => Effect.Effect<A, E>) => Effect.runPromise(PgClient.PgClient.pipe(Effect.flatMap(f), Effect.provide(DatabaseLive)));
const waitFor = (id: string, status: string) => Effect.gen(function* () {
  const repo = yield* SyncRepository;
  while ((yield* repo.get(id))?.status !== status) yield* Effect.sleep("100 millis");
});

describe("Sydney scheduling", () => {
  it("uses Sydney top-of-hour boundaries and handles DST", () => {
    for (const now of ["2026-10-04T15:35:00Z", "2026-04-04T15:35:00Z"]) {
      const due = latestDueHour(new Date(now));
      expect(Cron.match(HourlySydney, due)).toBe(true);
      expect(due.getTime()).toBeLessThanOrEqual(Date.parse(now));
      expect(Cron.next(HourlySydney, new Date(now)).getTime()).toBeGreaterThan(Date.parse(now));
    }
  });
});

describe.runIf(hasDatabase)("durable sync (local postgres, no Google calls)", () => {
  const ids: string[] = [];
  const cleanup = async () => {
    for (const id of ids) await runSql((sql) => sql.withTransaction(Effect.gen(function* () {
      yield* sql`update sheets_sync_control set active_run_id = null, lease_owner = null, lease_until = null where active_run_id = ${id}`;
      yield* sql`delete from sheets_sync_runs where id = ${id}`;
    })));
  };
  it("starts without credentials, exposes not-configured status and rejects manual sync", async () => {
    const layer = SheetsSyncLive.pipe(Layer.provide(DatabaseLive), Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ DATABASE_URL: process.env.DATABASE_URL }))));
    await Effect.runPromise(Effect.gen(function* () {
      const service = yield* SheetsSyncService;
      expect((yield* service.status()).configurationStatus).toBe("not-configured");
      expect(yield* service.trigger().pipe(Effect.flip)).toBeInstanceOf(SyncNotConfiguredError);
      yield* service.tick(new Date());
    }).pipe(Effect.provide(layer)));
  });
  it("reserves exclusively, coalesces weeks of missed hours into one catchup, and persists ownership", async () => {
    const due = latestDueHour(new Date());
    const owner = randomUUID();
    try {
      await runSql((sql) => sql`update sheets_sync_control set scheduled_through = ${new Date(due.getTime() - 30 * 86400000).toISOString()}::timestamptz where id = 1 and active_run_id is null`);
      const run1 = await run((repo) => repo.reserve("scheduled", due));
      expect(run1).not.toBeNull(); ids.push(run1!.id);
      expect(await run((repo) => repo.reserve("manual").pipe(Effect.flip))).toBeInstanceOf(SyncBusyError);
      expect(await run((repo) => repo.reserve("scheduled", due))).toBeNull();
      expect(await run((repo) => repo.acquire(run1!.id, owner))).toBe(true);
      expect(await run((repo) => repo.acquire(run1!.id, randomUUID()))).toBe(false);
      expect(await run((repo) => repo.finish(run1!.id, owner, { outcome: "succeeded", guestCount: 0, error: null }))).toBe(true);
      expect(await run((repo) => repo.reserve("scheduled", due))).toBeNull();
      const snapshot = await run((repo) => repo.snapshot());
      expect(snapshot[0]).toEqual(Array.from(SnapshotHeaders));
      expect(snapshot.every((row) => row.length === SnapshotHeaders.length)).toBe(true);
    } finally { await cleanup(); }
  });
  it("exports more than the admin pagination cap with full fields and group names", async () => {
    const prefix = `snapshot-${randomUUID()}`;
    const groupId = randomUUID();
    try {
      await runSql((sql) => sql.withTransaction(Effect.gen(function* () {
        yield* sql`insert into guest_groups(id, name) values (${groupId}, 'Snapshot Group')`;
        yield* sql`insert into guests(display_name, normalized_name, nickname, invitation_status, guest_type, owner_key, internal_notes, group_id)
          select ${prefix} || '-' || n, ${prefix} || '-' || n, 'Nickname', 'Yes', 'Friends', 'Kevin', 'Internal Notes', ${groupId}::uuid
          from generate_series(1, 1001) n`;
      })));
      const rows = (await run((repo) => repo.snapshot())).filter((row) => row[1]?.startsWith(prefix));
      expect(rows).toHaveLength(1001);
      expect(rows[0]).toHaveLength(16);
      expect(rows[0]?.[2]).toBe('Nickname');
      expect(rows[0]?.[7]).toBe('Internal Notes');
      expect(rows[0]?.[12]).toBe(groupId);
      expect(rows[0]?.[13]).toBe('Snapshot Group');
      expect(Number.isNaN(Date.parse(rows[0]![14]!))).toBe(false);
    } finally {
      await runSql((sql) => sql.withTransaction(Effect.gen(function* () {
        yield* sql`delete from guests where normalized_name like ${prefix + '-%'}`;
        yield* sql`delete from guest_groups where id = ${groupId}`;
      })));
    }
  });
  it("keeps a paused live-connection writer serialized after lease expiry", async () => {
    const run1 = await run((repo) => repo.reserve("manual")); ids.push(run1!.id);
    const owner = randomUUID();
    const events: string[] = [];
    try {
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const repository = yield* SyncRepository;
        const sql = yield* PgClient.PgClient;
        const entered = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const oldWriter = yield* repository.withWriteLock(() => Effect.gen(function* () {
          expect(yield* repository.acquire(run1!.id, owner)).toBe(true);
          events.push("old-enter");
          yield* Deferred.succeed(entered, undefined);
          yield* Deferred.await(release); // simulates a paused process with a live SQL connection
          expect(yield* repository.acquire(run1!.id, owner)).toBe(true);
          expect(yield* repository.finish(run1!.id, owner, { outcome: "succeeded", guestCount: 0, error: null })).toBe(true);
          events.push("old-finish");
        })).pipe(Effect.forkScoped);
        yield* Deferred.await(entered);
        yield* sql`update sheets_sync_control set lease_until = now() - interval '1 second' where active_run_id = ${run1!.id}`;
        const recovery = yield* repository.withWriteLock(() => Effect.sync(() => { events.push("recovery-enter"); })).pipe(Effect.forkScoped);
        yield* Effect.sleep("300 millis");
        expect(events).toEqual(["old-enter"]);
        expect(yield* repository.reserve("manual").pipe(Effect.flip)).toBeInstanceOf(SyncBusyError);
        expect(yield* repository.reserve("scheduled", new Date(Date.now() + 86400000)).pipe(Effect.flip)).toBeInstanceOf(SyncBusyError);
        yield* Deferred.succeed(release, undefined);
        yield* Fiber.join(oldWriter);
        yield* Fiber.join(recovery);
        expect(events).toEqual(["old-enter", "old-finish", "recovery-enter"]);
      })).pipe(Effect.provide(SyncRepository.layer.pipe(Layer.provideMerge(DatabaseLive))), Effect.timeout("15 seconds")));
    } finally { await cleanup(); }
  });
  it("runs the configured scheduler with a mock writer, rejects manual overlap and executes one overdue catchup", async () => {
    const config = Layer.succeed(SheetsSyncConfig, { configured: true, email: Redacted.make("mock@example.invalid"), privateKey: Redacted.make("mock-only"), spreadsheetId: Redacted.make("mock-only") });
    const watermark = (await runSql((sql) => sql<{ scheduled_through: Date | null }>`select scheduled_through from sheets_sync_control where id = 1`))[0]!.scheduled_through;
    const due = latestDueHour(new Date());
    let writes = 0;
    let release = false;
    let fail = false;
    const writer = Layer.succeed(SheetsWriter, { write: () => Effect.gen(function* () {
      writes++;
      while (!release) yield* Effect.sleep("100 millis");
      if (fail) return yield* Effect.fail(new Error("private-provider-response-do-not-store"));
    }) });
    const dependencies = Layer.mergeAll(SyncRepository.layer, config, writer);
    const layer = SheetsSyncService.layer.pipe(
      Layer.provide(SheetsSyncWorkflowLive.pipe(Layer.provide(dependencies))),
      Layer.provide(dependencies), Layer.provide(DurableSyncEngineLive),
      Layer.provideMerge(SyncRepository.layer), Layer.provide(DatabaseLive),
    );
    await runSql((sql) => sql`update sheets_sync_control set scheduled_through = ${due.toISOString()}::timestamptz where id = 1`);
    try {
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const service = yield* SheetsSyncService;
        const manual = yield* service.trigger(); ids.push(manual.id);
        yield* waitFor(manual.id, "running");
        while (writes === 0) yield* Effect.sleep("100 millis");
        expect(yield* service.trigger().pipe(Effect.flip)).toBeInstanceOf(SyncBusyError);
        const overdue = new Date(due.getTime() + 30 * 86400000);
        yield* service.tick(overdue); // active manual dispatch is reused, not overlapped
        expect(writes).toBe(1);
        release = true;
        yield* waitFor(manual.id, "succeeded");
        yield* service.tick(overdue);
        const catchup = (yield* service.status()).latestRun;
        expect(catchup?.trigger).toBe("scheduled"); ids.push(catchup!.id);
        yield* service.tick(overdue);
        yield* waitFor(catchup!.id, "succeeded");
        expect(writes).toBe(2);
        yield* service.tick(overdue);
        expect((yield* service.status()).activeRun).toBeNull();
        fail = true;
        const failed = yield* service.trigger(); ids.push(failed.id);
        yield* waitFor(failed.id, "failed");
        const failedRun = (yield* service.status()).latestRun;
        expect(failedRun?.error).toBe("Google Sheets sync failed. Check service-account access and configuration.");
        expect(JSON.stringify(failedRun)).not.toContain("private-provider-response");
        expect(writes).toBe(3);
      })).pipe(Effect.provide(layer), Effect.timeout("40 seconds")));
    } finally {
      release = true;
      await cleanup();
      await runSql((sql) => sql`update sheets_sync_control set scheduled_through = ${watermark?.toISOString() ?? null}::timestamptz where id = 1`);
    }
  }, 60000);
  it("rebuilds the SQL engine after interruption, resumes running work and reuses durable activity results", async () => {
    let writes = 0;
    const guestId = randomUUID();
    const exportedNotes: string[] = [];
    await runSql((sql) => sql`insert into guests(id, display_name, normalized_name, invitation_status, guest_type, owner_key, internal_notes)
      values (${guestId}, ${guestId}, ${guestId}, 'Yes', 'Friends', 'Kevin', 'before restart')`);
    const writerLayer = (blocked: boolean) => Layer.succeed(SheetsWriter, { write: (rows) => Effect.sync(() => {
      writes++;
      exportedNotes.push(rows.find((row) => row[0] === guestId)![7]!);
    }).pipe(Effect.andThen(blocked ? Effect.never : Effect.void)) });
    const executionLayer = (blocked: boolean) => SheetsSyncWorkflowLive.pipe(
      Layer.provide(Layer.mergeAll(SyncRepository.layer, writerLayer(blocked))),
      Layer.provideMerge(DurableSyncEngineLive),
      Layer.provideMerge(SyncRepository.layer), Layer.provide(DatabaseLive),
    );
    const run1 = await run((repo) => repo.reserve("manual")); ids.push(run1!.id);
    try {
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        yield* SheetsSyncWorkflow.execute({ runId: run1!.id }, { discard: true });
        yield* waitFor(run1!.id, "running");
        while (writes === 0) yield* Effect.sleep("100 millis");
      })).pipe(Effect.provide(executionLayer(true)), Effect.timeout("40 seconds")));
      expect((await run((repo) => repo.get(run1!.id)))?.status).toBe("running");
      await runSql((sql) => sql`update guests set internal_notes = 'edited during downtime' where id = ${guestId}`);
      // Simulate the crash lease-expiry boundary without waiting 120 seconds.
      await runSql((sql) => sql`update sheets_sync_control set lease_until = now() - interval '1 second' where active_run_id = ${run1!.id}`);
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const result = yield* SheetsSyncWorkflow.execute({ runId: run1!.id });
        expect(result.outcome).toBe("succeeded");
        const replay = yield* SheetsSyncWorkflow.execute({ runId: run1!.id });
        expect(replay).toEqual(result);
      })).pipe(Effect.provide(executionLayer(false)), Effect.timeout("30 seconds")));
      expect(writes).toBe(2); // interrupted write + resumed write; replay writes nothing
      expect(exportedNotes).toEqual(["before restart", "edited during downtime"]);
      const finished = await run((repo) => repo.get(run1!.id));
      expect(finished).toMatchObject({ status: "succeeded", error: null });
      expect(finished?.startedAt).not.toBeNull(); expect(finished?.finishedAt).not.toBeNull();
    } finally {
      await cleanup();
      await runSql((sql) => sql`delete from guests where id = ${guestId}`);
    }
  }, 60000);
});
