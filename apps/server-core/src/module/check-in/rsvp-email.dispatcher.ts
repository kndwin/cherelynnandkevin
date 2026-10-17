import { renderConfirmation, templateVersion } from "@cherelynnandkevin/rsvp-email";
import { and, eq, lte, sql } from "drizzle-orm";
import { Effect, Layer, Redacted, Schedule } from "effect";
import { Database } from "@/platform/database.interface.ts";
import { GuestTable } from "./guest.table.ts";
import { RsvpEmailConfig } from "./rsvp-email.config.ts";
import { RsvpEmailDraftTable as Draft } from "./rsvp-email.table.ts";
import { sendEmail, type SendOutcome, type EmailHttp } from "./rsvp-email.provider.ts";

export const retryDelay = (attempts: number) => 60_000 * 2 ** (attempts - 1);
export const completion = (outcome: SendOutcome, attempts: number, now: Date) => ({
  status: outcome === "throttled" ? (attempts < 3 ? "pending" : "failed") : outcome,
  nextAttemptAt: new Date(now.getTime() + retryDelay(attempts)),
});

export const makeDispatcher = Effect.gen(function* () {
  const { db } = yield* Database;
  const config = yield* RsvpEmailConfig;
  return (http: EmailHttp = fetch) => Effect.gen(function* () {
    if (!config.enabled) return;
    // A claim is never retried after a crash. Timeout is shorter than this hold.
    yield* db.update(Draft).set({ status: "unknown" }).where(and(eq(Draft.status, "sending"), lte(Draft.claimedAt, new Date(Date.now() - 300_000))));
    const row = yield* db.transaction((tx) => Effect.gen(function* () {
      // Discover without locking, then follow RSVP writers' guest -> draft order.
      // Draft-first would deadlock with an unchanged save inserting the same
      // unique guest/revision/kind key while it holds the guest lock.
      const [discovered] = yield* tx.select().from(Draft).where(and(eq(Draft.status, "pending"), lte(Draft.nextAttemptAt, new Date())))
        .orderBy(Draft.nextAttemptAt).limit(1);
      if (!discovered) return null;
      const [guest] = yield* tx.select().from(GuestTable).where(eq(GuestTable.id, discovered.guestId)).for("update");
      const [candidate] = yield* tx.select().from(Draft).where(and(eq(Draft.id, discovered.id), eq(Draft.status, "pending"), lte(Draft.nextAttemptAt, new Date())))
        .for("update", { skipLocked: true });
      if (!candidate) return null;
      if (!guest || guest.invitationStatus !== "Yes" || guest.rsvpStatus !== "Yes" || guest.rsvpRevision !== candidate.revision || guest.rsvpEmail !== candidate.snapshot.email) {
        yield* tx.update(Draft).set({ status: "cancelled" }).where(eq(Draft.id, candidate.id));
        return null;
      }
      if (candidate.templateVersion !== templateVersion || candidate.snapshot.attending !== "Yes" || candidate.attempts >= 3) {
        yield* tx.update(Draft).set({ status: "failed" }).where(eq(Draft.id, candidate.id));
        return null;
      }
      const [claimed] = yield* tx.update(Draft).set({ status: "sending", attempts: sql`${Draft.attempts} + 1`, claimedAt: new Date() }).where(eq(Draft.id, candidate.id)).returning();
      return claimed!;
    }));
    if (!row) return;
    // Rendering cannot send; failures here are safe to mark terminal failed.
    const rendered = yield* Effect.tryPromise(() => renderConfirmation({ ...row.snapshot, attending: "Yes" }))
      .pipe(Effect.catch(() => Effect.succeed(null)));
    // Once invocation is possible, even an unexpected exception is ambiguous.
    const outcome = rendered === null ? "failed" : yield* Effect.tryPromise(() =>
      sendEmail(config.accountId, Redacted.value(config.token), { ...rendered, from: config.from, replyTo: config.replyTo, to: row.snapshot.email }, http),
    ).pipe(Effect.catch(() => Effect.succeed("unknown" as const)));
    // A stale-claim recovery must not be overwritten by a delayed result.
    yield* db.update(Draft).set(completion(outcome, row.attempts, new Date())).where(and(eq(Draft.id, row.id), eq(Draft.status, "sending")));
  });
});

export const RsvpEmailDispatcherLive = Layer.effectDiscard(Effect.gen(function* () {
  const config = yield* RsvpEmailConfig;
  if (!config.enabled) return;
  const tick = yield* makeDispatcher;
  yield* tick().pipe(
    Effect.catchCause(() => Effect.logWarning("RSVP email dispatcher tick failed; persisted claims are held for review")),
    Effect.repeat(Schedule.spaced("5 seconds")), Effect.forkScoped,
  );
})).pipe(Layer.provide(RsvpEmailConfig.layer));
