import { randomUUID } from "node:crypto";
import { Effect, Schedule, Schema } from "effect";
import * as Workflow from "effect/unstable/workflow/Workflow";
import * as Activity from "effect/unstable/workflow/Activity";
import { SheetsWriter } from "./sheets.writer.ts";
import { SyncRepository } from "./sync.repository.ts";

const SyncResultSchema = Schema.Struct({ outcome: Schema.Literals(["succeeded", "failed"]), guestCount: Schema.Int, error: Schema.NullOr(Schema.String) });
const retryDatabase = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(
  Effect.mapError(() => new Error("Sync persistence temporarily unavailable")),
  Effect.retry(Schedule.spaced("2 seconds")), Effect.orDie,
);

export const SheetsSyncWorkflow = Workflow.make({
  name: "WebsiteGuestsSnapshot", payload: { runId: Schema.String },
  idempotencyKey: ({ runId }) => runId, success: SyncResultSchema,
});

export const SheetsSyncWorkflowLive = SheetsSyncWorkflow.toLayer(({ runId }) => Effect.gen(function* () {
  const repository = yield* SyncRepository;
  const writer = yield* SheetsWriter;
  return yield* Activity.make({ name: "ReplaceOwnedWorksheet", success: SyncResultSchema, execute: retryDatabase(repository.withWriteLock((assertAlive) => Effect.gen(function* () {
    const owner = randomUUID();
    while (true) {
      const existing = yield* retryDatabase(repository.get(runId));
      // Crash after DB completion but before durable activity reply: do not write again.
      if (existing?.status === "succeeded" || existing?.status === "failed") return { outcome: existing.status, guestCount: existing.guestCount ?? 0, error: existing.error };
      if (yield* retryDatabase(repository.acquire(runId, owner))) break;
      yield* Effect.sleep("2 seconds");
    }
    // Do not durably cache a snapshot before ownership. Each unfinished replay
    // reads current guests AFTER serialization and lease ownership are acquired.
    const rows = yield* retryDatabase(repository.snapshot());
    yield* assertAlive;
    const renew = Effect.gen(function* () {
      while (true) {
        yield* Effect.sleep("20 seconds");
        yield* assertAlive;
        if (!(yield* retryDatabase(repository.renew(runId, owner)))) return yield* Effect.fail(new Error("Sync ownership lost"));
      }
    });
    // The writer is abortable and bounded to 60s, shorter than the 120s lease.
    // If renewal loses ownership, race interrupts/aborts any ongoing HTTP request.
    const result = yield* Effect.raceFirst(writer.write(rows), renew).pipe(
      Effect.as({ outcome: "succeeded" as const, guestCount: Math.max(0, rows.length - 1), error: null as string | null }),
      Effect.catchCause(() => Effect.succeed({ outcome: "failed" as const, guestCount: Math.max(0, rows.length - 1), error: "Google Sheets sync failed. Check service-account access and configuration." })),
    );
    // A lost serialization connection must not finalize this run. Reacquire a
    // fresh connection/lock and snapshot on retry, after the HTTP effect stops.
    yield* assertAlive;
    while (!(yield* retryDatabase(repository.finish(runId, owner, result)))) {
      // A long database outage can outlive the lease after HTTP has stopped.
      // Reclaim only an expired lease, or wait for the other owner to finish;
      // never finalize a run currently owned by another execution.
      const current = yield* retryDatabase(repository.get(runId));
      if (current?.status === "succeeded" || current?.status === "failed") return { outcome: current.status, guestCount: current.guestCount ?? 0, error: current.error };
      yield* retryDatabase(repository.acquire(runId, owner));
      yield* Effect.sleep("2 seconds");
    }
    return result;
  }))) });
}));
