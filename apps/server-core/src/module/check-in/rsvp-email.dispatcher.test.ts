import { ConfigProvider, Deferred, Effect, Fiber, Layer, Redacted } from "effect";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { Database } from "@/platform/database.interface.ts";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { hasDisposableTestDatabase } from "@/platform/test-database.guard.ts";
import { GuestRepository } from "./guest.repository.default.ts";
import { RsvpEmailConfig } from "./rsvp-email.config.ts";
import { RsvpEmailDraftTable as Draft } from "./rsvp-email.table.ts";
import { makeDispatcher } from "./rsvp-email.dispatcher.ts";
import { GuestTable } from "./guest.table.ts";

describe.runIf(hasDisposableTestDatabase())("RSVP dispatch (isolated postgres, mock HTTP)", () => {
  it("enqueues enabled revisions and preserves historical unchanged disabled drafts", async () => {
    await Effect.runPromise(Effect.gen(function* () {
      const repo = yield* GuestRepository;
      const { db } = yield* Database;
      const firstName = `Enable${Date.now()}`;
      const guest = yield* repo.adminCreate({ input: { displayName: `${firstName} Test`, invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" } });
      const input = { firstName, lastName: "Test", sitePassword: "kc27", attending: "Yes" as const, email: "enabled@example.com", notes: "", dietaryRequirements: "", expectedRevision: 0 };
      const enabled = ConfigProvider.layer(ConfigProvider.fromUnknown({ RSVP_EMAIL_ENABLED: "true", CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_EMAIL_API_TOKEN: "mock", RSVP_EMAIL_FROM: "sender@example.com" }));
      try {
        const saved = yield* repo.saveRsvp({ input }).pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ RSVP_EMAIL_ENABLED: "false" }))));
        yield* repo.saveRsvp({ input: { ...input, expectedRevision: saved.rsvpRevision } }).pipe(Effect.provide(enabled));
        const historical = yield* db.select().from(Draft).where(eq(Draft.guestId, guest.id));
        expect(historical).toHaveLength(1);
        expect(historical[0]!.status).toBe("draft_disabled");
        const changed = yield* repo.saveRsvp({ input: { ...input, expectedRevision: saved.rsvpRevision, dietaryRequirements: "Vegan" } }).pipe(Effect.provide(enabled));
        yield* repo.saveRsvp({ input: { ...input, expectedRevision: changed.rsvpRevision, dietaryRequirements: "Vegan" } }).pipe(Effect.provide(enabled));
        const rows = yield* db.select().from(Draft).where(eq(Draft.guestId, guest.id));
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.revision === changed.rsvpRevision)!.status).toBe("pending");
        expect(rows.find((row) => row.revision === saved.rsvpRevision)!.status).toBe("draft_disabled");
      } finally {
        yield* db.delete(Draft).where(eq(Draft.guestId, guest.id));
        yield* repo.adminDelete({ id: guest.id });
      }
    }).pipe(Effect.provide(GuestRepository.layer), Effect.provide(DatabaseLive)));
  });
  it("claims once under concurrency, cancels obsolete rows and holds crash claims", async () => {
    const config = Layer.succeed(RsvpEmailConfig, { enabled: true, accountId: "a".repeat(32), token: Redacted.make("mock"), from: "sender@example.com", replyTo: "" });
    await Effect.runPromise(Effect.gen(function* () {
      const { db } = yield* Database;
      const repo = yield* GuestRepository;
      const guest = yield* repo.adminCreate({ input: { displayName: `Dispatch ${Date.now()}`, invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" } });
      const snapshot = { displayName: guest.displayName, email: "guest@example.com", attending: "Yes" as const, dietaryRequirements: "" };
      try {
        // No RSVP exists: never dispatch an obsolete snapshot.
        yield* db.insert(Draft).values({ guestId: guest.id, revision: 0, snapshot, status: "pending" });
        const tick = yield* makeDispatcher;
        let calls = 0;
        const http = async () => { calls++; return new Response(JSON.stringify({ success: true, result: { queued: [snapshot.email] } })); };
        yield* Effect.all([tick(http), tick(http)], { concurrency: 2 });
        const rows = () => db.select().from(Draft).where(eq(Draft.guestId, guest.id));
        expect((yield* rows())[0]!.status).toBe("cancelled");
        yield* db.update(Draft).set({ status: "sending", claimedAt: new Date(0) }).where(eq(Draft.guestId, guest.id));
        yield* tick(http);
        expect((yield* rows())[0]!.status).toBe("unknown");
        expect(calls).toBe(0);
        const [updated] = yield* db.update(GuestTable).set({ rsvpStatus: "Yes", rsvpEmail: snapshot.email }).where(eq(GuestTable.id, guest.id)).returning();
        yield* db.insert(Draft).values({ guestId: guest.id, revision: updated!.rsvpRevision, snapshot, status: "pending" });
        yield* Effect.all([tick(http), tick(http)], { concurrency: 2 });
        expect(calls).toBe(1);
        expect((yield* rows()).filter((row) => row.status === "accepted")).toHaveLength(1);
        const currentDraft = (yield* rows()).find((row) => row.revision === updated!.rsvpRevision)!;
        let rejections = 0;
        for (let attempt = 1; attempt <= 3; attempt++) {
          yield* db.update(Draft).set({ status: "pending", nextAttemptAt: new Date(0), ...(attempt === 1 ? { attempts: 0 } : {}) }).where(eq(Draft.id, currentDraft.id));
          yield* tick(async () => {
            rejections++;
            return new Response(JSON.stringify({ success: false, errors: [{ code: 10004 }] }), { status: 429 });
          });
          const throttled = (yield* rows()).find((row) => row.id === currentDraft.id)!;
          expect(throttled.attempts).toBe(attempt);
          expect(throttled.status).toBe(attempt < 3 ? "pending" : "failed");
          yield* tick(http);
          expect(calls).toBe(1);
        }
        expect(rejections).toBe(3);
        // Hold an uncommitted decline behind the guest lock. An unlocked read
        // would see the previous Yes and call HTTP before this writer commits.
        yield* db.update(Draft).set({ status: "pending", attempts: 0, nextAttemptAt: new Date(0) }).where(and(eq(Draft.guestId, guest.id), eq(Draft.revision, updated!.rsvpRevision)));
        const locked = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const writer = yield* db.transaction((tx) => Effect.gen(function* () {
          yield* tx.update(GuestTable).set({ rsvpStatus: "No" }).where(eq(GuestTable.id, guest.id));
          yield* Deferred.succeed(locked, undefined);
          yield* Deferred.await(release);
        })).pipe(Effect.forkChild);
        yield* Deferred.await(locked);
        const dispatch = yield* tick(http).pipe(Effect.forkChild);
        try {
          yield* Effect.sleep("100 millis");
          expect(calls).toBe(1);
        } finally {
          yield* Deferred.succeed(release, undefined);
        }
        yield* Fiber.join(writer);
        yield* Fiber.join(dispatch);
        expect(calls).toBe(1);
        expect((yield* rows()).find((row) => row.revision === updated!.rsvpRevision)!.status).toBe("cancelled");
      } finally {
        yield* db.delete(Draft).where(eq(Draft.guestId, guest.id));
        yield* repo.adminDelete({ id: guest.id });
      }
    }).pipe(Effect.provide(GuestRepository.layer), Effect.provide(config), Effect.provide(DatabaseLive)));
  });
});
