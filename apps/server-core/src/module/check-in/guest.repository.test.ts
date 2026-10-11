import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { GuestRepository } from "./guest.repository.default.ts";
import { CheckinGuestNotFoundError, GuestValidationError } from "./guest.schema.ts";
import { DatabaseLive as DatabaseLiveLayer } from "@/platform/database.layer.ts";

// Requires a migrated local database, e.g.:
//   pnpm infra:db:up && <server-core> pnpm migrate && pnpm seed
//   DATABASE_URL=... pnpm test
// Skipped when DATABASE_URL is unset so unit runs stay hermetic.
const HasDatabase = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;

const TestLive = GuestRepository.layer.pipe(Layer.provide(DatabaseLiveLayer));

const run = <A, E>(effect: Effect.Effect<A, E, GuestRepository>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLive)));

const uniqueName = (prefix: string): string => `${prefix} ${Date.now()} ${Math.floor(Math.random() * 1e6)}`;

describe.runIf(HasDatabase)("GuestRepository (postgres)", () => {
  it("creates, authorizes, reads, and updates an RSVP without leaking internal notes", async () => {
    const displayName = uniqueName("Repo Test");
    const created = await run(
      GuestRepository.pipe(
        Effect.flatMap((repository) =>
          repository.adminCreate({
            input: {
              displayName,
              invitationStatus: "Yes",
              guestType: "Friends",
              ownerKey: "Kevin",
              internalNotes: "repo-only note",
            },
          })
        ),
      ),
    );
    expect(created.displayName).toBe(displayName);
    expect(created.rsvpStatus).toBe("");

    try {
      const eligible = await run(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.findEligibleByName({ firstName: displayName.split(" ")[0] ?? "", lastName: displayName.split(" ").slice(1).join(" ") })
          ),
        ),
      );
      expect(eligible.id).toBe(created.id);

      const blank = await run(
        GuestRepository.pipe(
          Effect.flatMap((repository) => repository.getRsvp({ firstName: displayName.split(" ")[0] ?? "", lastName: displayName.split(" ").slice(1).join(" ") })),
        ),
      );
      expect(blank.attending).toBe("");
      expect(blank).not.toHaveProperty("internalNotes");

      const saved = await run(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.saveRsvp({
              input: {
                firstName: displayName.split(" ")[0] ?? "",
                lastName: displayName.split(" ").slice(1).join(" "),
                sitePassword: "kc27",
                attending: "Yes",
                email: "repo@example.com",
                notes: "See you there",
              },
            })
          ),
        ),
      );
      expect(saved.attending).toBe("Yes");
      expect(saved.spreadsheetStatus).toBe("updated");

      const reread = await run(
        GuestRepository.pipe(
          Effect.flatMap((repository) => repository.getRsvp({ firstName: displayName.split(" ")[0] ?? "", lastName: displayName.split(" ").slice(1).join(" ") })),
        ),
      );
      expect(reread).toMatchObject({ attending: "Yes", email: "repo@example.com", notes: "See you there" });
    } finally {
      await run(
        GuestRepository.pipe(Effect.flatMap((repository) => repository.adminDelete({ id: created.id }))),
      );
    }
  });

  it("denies public auth for Maybe guests while keeping them admin-editable", async () => {
    const displayName = uniqueName("Maybe Guest");
    const created = await run(
      GuestRepository.pipe(
        Effect.flatMap((repository) =>
          repository.adminCreate({
            input: { displayName, invitationStatus: "Maybe", guestType: "Friends", ownerKey: "Cher" },
          })
        ),
      ),
    );
    try {
      const [first, ...rest] = displayName.split(" ");
      const failure = await Effect.runPromise(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.findEligibleByName({ firstName: first ?? "", lastName: rest.join(" ") })
          ),
          Effect.flip,
          Effect.provide(TestLive),
        ),
      );
      expect(failure).toBeInstanceOf(CheckinGuestNotFoundError);

      const updated = await run(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.adminUpdate({ id: created.id, input: { invitationStatus: "Yes" } })
          ),
        ),
      );
      expect(updated.invitationStatus).toBe("Yes");
    } finally {
      await run(
        GuestRepository.pipe(Effect.flatMap((repository) => repository.adminDelete({ id: created.id }))),
      );
    }
  });

  it("rejects duplicate normalized names and invalid input", async () => {
    const displayName = uniqueName("Dupe Guest");
    const created = await run(
      GuestRepository.pipe(
        Effect.flatMap((repository) =>
          repository.adminCreate({
            input: { displayName, invitationStatus: "Yes", guestType: "Work", ownerKey: "Kevin" },
          })
        ),
      ),
    );
    try {
      const dupe = await Effect.runPromise(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.adminCreate({
              input: {
                displayName: `  ${displayName.toUpperCase()}  `,
                invitationStatus: "Yes",
                guestType: "Work",
                ownerKey: "Kevin",
              },
            })
          ),
          Effect.flip,
          Effect.provide(TestLive),
        ),
      );
      expect(dupe).toBeInstanceOf(GuestValidationError);

      const badEmail = await Effect.runPromise(
        GuestRepository.pipe(
          Effect.flatMap((repository) =>
            repository.adminUpdate({ id: created.id, input: { rsvpEmail: "not-an-email" } })
          ),
          Effect.flip,
          Effect.provide(TestLive),
        ),
      );
      expect(badEmail).toBeInstanceOf(GuestValidationError);
    } finally {
      await run(
        GuestRepository.pipe(Effect.flatMap((repository) => repository.adminDelete({ id: created.id }))),
      );
    }
  });

  it("lists with search, filters, and bounded pagination", async () => {
    const result = await run(
      GuestRepository.pipe(
        Effect.flatMap((repository) =>
          repository.adminList({ input: { page: 1, pageSize: 5, invitationStatus: "Yes" } })
        ),
      ),
    );
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(5);
    expect(result.total).toBeGreaterThan(0);
    expect(result.guests.length).toBeLessThanOrEqual(5);
    for (const guest of result.guests) {
      expect(guest.invitationStatus).toBe("Yes");
    }

    const searched = await run(
      GuestRepository.pipe(
        Effect.flatMap((repository) => repository.adminList({ input: { search: "Matthew Niv" } })),
      ),
    );
    expect(searched.guests.some((guest) => guest.displayName === "Matthew Niv")).toBe(true);
  });
});
