import type { AdminListFailedAttemptsQuery, AdminUpdateFailedAttemptRequest, FailedAuthReason } from "@cherelynnandkevin/client-api-contract/admin/http";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { Database } from "@/platform/database.interface.ts";
import { FailedAuthAttemptTable as Attempts } from "./operations.table.ts";

export class FailedAttemptNotFoundError extends Schema.TaggedErrorClass<FailedAttemptNotFoundError>()("FailedAttemptNotFoundError", {}) {}

const toDto = (row: typeof Attempts.$inferSelect) => ({
  ...row, reason: row.reason as FailedAuthReason, status: row.status as "new" | "resolved",
  firstSeenAt: row.firstSeenAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString(),
});

export class OperationsRepository extends Context.Service<OperationsRepository>()(
  "cherelynnandkevin/server-core/module/admin/OperationsRepository",
  { make: Effect.gen(function* () {
    const { db } = yield* Database;
    return {
      // The record input intentionally has no password/payload field. This is
      // one atomic upsert, including reopen; admin notes and firstSeenAt survive.
      recordFailure: ({ normalizedName, reason }: { normalizedName: string; reason: FailedAuthReason }) =>
        db.insert(Attempts).values({ normalizedName, reason }).onConflictDoUpdate({
          target: [Attempts.normalizedName, Attempts.reason],
          set: { count: sql`${Attempts.count} + 1`, lastSeenAt: sql`greatest(${Attempts.lastSeenAt}, clock_timestamp())`, status: "new" },
        }).pipe(Effect.asVoid),
      list: (input: AdminListFailedAttemptsQuery = {}) => Effect.gen(function* () {
        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 50;
        const where = and(input.status === undefined ? undefined : eq(Attempts.status, input.status), input.reason === undefined ? undefined : eq(Attempts.reason, input.reason));
        const [totals, rows] = yield* Effect.all([
          db.select({ total: count() }).from(Attempts).where(where),
          db.select().from(Attempts).where(where).orderBy(desc(Attempts.lastSeenAt), Attempts.id).limit(pageSize).offset((page - 1) * pageSize),
        ]);
        return { attempts: rows.map(toDto), total: totals[0]?.total ?? 0, page, pageSize };
      }),
      update: ({ id, input }: { id: string; input: AdminUpdateFailedAttemptRequest }) => Effect.gen(function* () {
        const patch = { ...(input.status === undefined ? {} : { status: input.status }), ...(input.notes === undefined ? {} : { notes: input.notes }) };
        const rows = yield* (Object.keys(patch).length === 0 ? db.select().from(Attempts).where(eq(Attempts.id, id)) : db.update(Attempts).set(patch).where(eq(Attempts.id, id)).returning());
        if (!rows[0]) return yield* new FailedAttemptNotFoundError({});
        return toDto(rows[0]);
      }),
      deleteOne: ({ id }: { id: string }) => Effect.gen(function* () {
        const rows = yield* db.delete(Attempts).where(eq(Attempts.id, id)).returning({ id: Attempts.id });
        if (!rows[0]) return yield* new FailedAttemptNotFoundError({});
        return { deletedCount: 1 };
      }),
      deleteMany: ({ ids }: { ids: readonly string[] }) => db.delete(Attempts).where(inArray(Attempts.id, [...new Set(ids)])).returning({ id: Attempts.id }).pipe(Effect.map((rows) => ({ deletedCount: rows.length }))),
    };
  }) },
) {
  static readonly layer = Layer.effect(OperationsRepository)(OperationsRepository.make);
}
