import { Effect, Layer } from "effect";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { GuestRepository } from "./guest.repository.default.ts";
import { GuestTable } from "./guest.table.ts";
import { RsvpEmailDraftTable } from "./rsvp-email.table.ts";
import { Database } from "@/platform/database.interface.ts";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { hasDisposableTestDatabase } from "@/platform/test-database.guard.ts";

const Live = GuestRepository.layer.pipe(Layer.provideMerge(DatabaseLive));
describe.runIf(hasDisposableTestDatabase())("disabled RSVP drafts (postgres)", () => {
  it("deduplicates revisions, captures dietary-only changes, and rolls back storage failures", async () => {
    await Effect.runPromise(Effect.gen(function* () {
      const repo = yield* GuestRepository;
      const { db } = yield* Database;
      const firstName = `Draft${Date.now()}`;
      const guest = yield* repo.adminCreate({ input: { displayName: `${firstName} Test`, invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" } });
      const input = { firstName, lastName: "Test", sitePassword: "kc27", attending: "Yes" as const, email: "draft@example.com", notes: "PRIVATE_DO_NOT_EMAIL", dietaryRequirements: "Vegetarian", expectedRevision: 0 };
      const drafts = () => db.select().from(RsvpEmailDraftTable).where(eq(RsvpEmailDraftTable.guestId, guest.id));
      try {
        const invalid = yield* repo.saveRsvp({ input: { ...input, email: "invalid" } }).pipe(Effect.exit);
        expect(invalid._tag).toBe("Failure");
        expect(yield* drafts()).toHaveLength(0);
        const declined = yield* repo.saveRsvp({ input: { ...input, attending: "No" } });
        expect(declined.attending).toBe("No");
        expect(yield* drafts()).toHaveLength(0);
        const saved = yield* repo.saveRsvp({ input: { ...input, expectedRevision: declined.rsvpRevision } });
        yield* repo.saveRsvp({ input: { ...input, expectedRevision: saved.rsvpRevision } });
        const stale = yield* repo.saveRsvp({ input }).pipe(Effect.exit);
        expect(stale._tag).toBe("Failure");
        const initial = yield* drafts();
        expect(initial).toHaveLength(1);
        expect(initial[0]!.status).toBe("draft_disabled");
        expect(initial[0]!.snapshot).toEqual({ displayName: guest.displayName, email: input.email, attending: "Yes", dietaryRequirements: "Vegetarian" });
        expect(JSON.stringify(initial)).not.toContain(input.notes);
        const changed = yield* repo.saveRsvp({ input: { ...input, dietaryRequirements: "Vegan", expectedRevision: saved.rsvpRevision } });
        expect(changed.rsvpRevision).toBe(saved.rsvpRevision + 1);
        expect(yield* drafts()).toHaveLength(2);
        const no = yield* repo.saveRsvp({ input: { ...input, attending: "No", expectedRevision: changed.rsvpRevision } });
        expect(no.rsvpRevision).toBe(changed.rsvpRevision + 1);
        expect(yield* drafts()).toHaveLength(2);
        const yesAgain = yield* repo.saveRsvp({ input: { ...input, expectedRevision: no.rsvpRevision } });
        expect(yesAgain.rsvpRevision).toBe(no.rsvpRevision + 1);
        const snapshots = yield* drafts();
        expect(snapshots).toHaveLength(3);
        expect(snapshots.find((draft) => draft.revision === yesAgain.rsvpRevision)?.snapshot).toEqual(initial[0]!.snapshot);
        // A scoped database trigger injects an outbox failure without touching
        // other tests' guests. Its DDL is removed in finally.
        yield* db.execute(sql.raw(`CREATE FUNCTION fail_draft_${firstName.toLowerCase()}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.guest_id = '${guest.id}'::uuid THEN RAISE EXCEPTION 'test outbox failure'; END IF; RETURN NEW; END $$`));
        yield* db.execute(sql.raw(`CREATE TRIGGER fail_draft_${firstName.toLowerCase()} BEFORE INSERT ON rsvp_email_drafts FOR EACH ROW EXECUTE FUNCTION fail_draft_${firstName.toLowerCase()}()`));
        const failed = yield* repo.saveRsvp({ input: { ...input, dietaryRequirements: "Gluten free", expectedRevision: yesAgain.rsvpRevision } }).pipe(Effect.exit);
        expect(failed._tag).toBe("Failure");
        const [persisted] = yield* db.select().from(GuestTable).where(eq(GuestTable.id, guest.id));
        expect(persisted!.rsvpStatus).toBe("Yes");
        expect(persisted!.rsvpRevision).toBe(yesAgain.rsvpRevision);
        expect(persisted!.dietaryRequirements).toBe("Vegetarian");
        expect(yield* drafts()).toHaveLength(3);
      } finally {
        yield* db.execute(sql.raw(`DROP TRIGGER IF EXISTS fail_draft_${firstName.toLowerCase()} ON rsvp_email_drafts`));
        yield* db.execute(sql.raw(`DROP FUNCTION IF EXISTS fail_draft_${firstName.toLowerCase()}()`));
        yield* db.delete(RsvpEmailDraftTable).where(eq(RsvpEmailDraftTable.guestId, guest.id));
        yield* repo.adminDelete({ id: guest.id });
      }
    }).pipe(Effect.provide(Live)));
  });
});
