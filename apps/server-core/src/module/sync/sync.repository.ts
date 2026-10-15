import type { AdminSyncRun } from "@cherelynnandkevin/client-api-contract/admin/http";
import { PgClient } from "@effect/sql-pg";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Context, Effect, Layer, Schema } from "effect";
import { Database } from "@/platform/database.interface.ts";
import { GuestTable } from "@/module/check-in/guest.table.ts";
import { GuestGroupTable } from "@/module/check-in/relationship.table.ts";

export class SyncBusyError extends Schema.TaggedErrorClass<SyncBusyError>()("SyncBusyError", {}) {}
export class SyncNotConfiguredError extends Schema.TaggedErrorClass<SyncNotConfiguredError>()("SyncNotConfiguredError", {}) {}
type RawRun = { id: string; trigger_kind: "manual" | "scheduled"; status: AdminSyncRun["status"]; queued_at: Date; started_at: Date | null; finished_at: Date | null; guest_count: number | null; error: string | null };
const toRun = (row: RawRun): AdminSyncRun => ({ id: row.id, trigger: row.trigger_kind, status: row.status, queuedAt: row.queued_at.toISOString(), startedAt: row.started_at?.toISOString() ?? null, finishedAt: row.finished_at?.toISOString() ?? null, guestCount: row.guest_count, error: row.error });

export const SnapshotHeaders = ["id", "displayName", "nickname", "normalizedName", "invitationStatus", "guestType", "ownerKey", "internalNotes", "rsvpStatus", "rsvpEmail", "rsvpNotes", "rsvpRevision", "groupId", "groupName", "createdAt", "updatedAt"] as const;

export class SyncRepository extends Context.Service<SyncRepository>()("SyncRepository", {
  make: Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;
    const { db } = yield* Database;
    return {
      // A dedicated reserved PostgreSQL connection holds a transaction-scoped
      // advisory lock. Lease expiry cannot admit a second live-connection writer.
      // This transaction contains ONLY lock/probe queries, not run row updates.
      withWriteLock: <A, E, R>(use: (assertAlive: Effect.Effect<void, Error>) => Effect.Effect<A, E, R>) => Effect.scoped(Effect.gen(function* () {
        const connection = yield* sql.reserve;
        const query = (statement: string) => connection.execute(statement, [], undefined)
          .pipe(Effect.mapError(() => new Error("Sync serialization connection unavailable")));
        // ROLLBACK releases the xact lock before the reserve scope returns the
        // connection to the pool. PgClient discards broken connections on its
        // connection error hook; cleanup failure must not mask a retryable loss.
        yield* Effect.acquireRelease(query("BEGIN"), () => query("ROLLBACK").pipe(Effect.catchCause(() => Effect.void)));
        while (true) {
          const rows = yield* query("SELECT pg_try_advisory_xact_lock(172927, 1) AS locked");
          if (rows[0]?.locked === true) break;
          yield* Effect.sleep("100 millis");
        }
        return yield* use(query("SELECT 1").pipe(Effect.asVoid));
      })),
      reserve: (trigger: "manual" | "scheduled", due?: Date) => sql.withTransaction(Effect.gen(function* () {
        const controls = yield* sql<{ active_run_id: string | null; scheduled_through: Date | null }>`select * from sheets_sync_control where id = 1 for update`;
        const control = controls[0]!;
        if (due && control.scheduled_through && control.scheduled_through.getTime() >= due.getTime()) return null;
        if (control.active_run_id !== null) return yield* new SyncBusyError({});
        const id = randomUUID();
        const rows = yield* sql<RawRun>`insert into sheets_sync_runs(id, trigger_kind) values (${id}, ${trigger}) returning *`;
        yield* sql`update sheets_sync_control set active_run_id = ${id}, lease_owner = null, lease_until = null,
          scheduled_through = coalesce(${due?.toISOString() ?? null}::timestamptz, scheduled_through) where id = 1`;
        return toRun(rows[0]!);
      })),
      active: () => sql<RawRun>`select r.* from sheets_sync_runs r join sheets_sync_control c on c.active_run_id = r.id where c.id = 1`.pipe(Effect.map((rows) => rows[0] ? toRun(rows[0]) : null)),
      history: () => sql<RawRun>`select * from sheets_sync_runs order by queued_at desc, id desc limit 50`.pipe(Effect.map((rows) => rows.map(toRun))),
      get: (id: string) => sql<RawRun>`select * from sheets_sync_runs where id = ${id}`.pipe(Effect.map((rows) => rows[0] ? toRun(rows[0]) : null)),
      acquire: (id: string, owner: string) => sql.withTransaction(Effect.gen(function* () {
        const claimed = yield* sql`update sheets_sync_control set lease_owner = ${owner}, lease_until = now() + interval '120 seconds'
          where id = 1 and active_run_id = ${id} and (lease_owner = ${owner} or lease_until is null or lease_until < now()) returning id`;
        if (!claimed[0]) return false;
        yield* sql`update sheets_sync_runs set status = 'running', started_at = coalesce(started_at, now()) where id = ${id}`;
        return true;
      })),
      renew: (id: string, owner: string) => sql`update sheets_sync_control set lease_until = now() + interval '120 seconds'
        where id = 1 and active_run_id = ${id} and lease_owner = ${owner} and lease_until > now() returning id`.pipe(Effect.map((rows) => rows.length === 1)),
      finish: (id: string, owner: string, result: { outcome: "succeeded" | "failed"; guestCount: number; error: string | null }) => sql.withTransaction(Effect.gen(function* () {
        const controls = yield* sql`select id from sheets_sync_control where id = 1 and active_run_id = ${id} and lease_owner = ${owner} and lease_until > now() for update`;
        if (!controls[0]) return false;
        yield* sql`update sheets_sync_runs set status = ${result.outcome}, guest_count = ${result.guestCount}, error = ${result.error}, finished_at = now() where id = ${id}`;
        yield* sql`update sheets_sync_control set active_run_id = null, lease_owner = null, lease_until = null where id = 1`;
        return true;
      })),
      // Read every guest, not the paginated/admin-capped endpoint.
      snapshot: () => db.select({ guest: GuestTable, groupName: GuestGroupTable.name }).from(GuestTable)
        .leftJoin(GuestGroupTable, eq(GuestTable.groupId, GuestGroupTable.id)).orderBy(GuestTable.displayName, GuestTable.id)
        .pipe(Effect.map((rows) => [Array.from(SnapshotHeaders), ...rows.map(({ guest: g, groupName }) => [g.id, g.displayName, g.nickname, g.normalizedName, g.invitationStatus, g.guestType, g.ownerKey, g.internalNotes, g.rsvpStatus, g.rsvpEmail, g.rsvpNotes, String(g.rsvpRevision), g.groupId ?? "", groupName ?? "", g.createdAt.toISOString(), g.updatedAt.toISOString()])])),
    };
  }),
}) {
  static readonly layer = Layer.effect(SyncRepository)(SyncRepository.make);
}
