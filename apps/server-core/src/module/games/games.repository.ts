import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { HttpApiError } from "effect/unstable/httpapi";
import type { Submit } from "@cherelynnandkevin/client-api-contract/games/http";
import { Database } from "../../platform/database.interface.ts";
import { GuestTable } from "../check-in/guest.table.ts";
import { toGuestFullName } from "../check-in/guest-name.ts";
import { WORDLE_ALLOWED_WORD_SET } from "../../../../client-engage-web/src/module/wordle/wordle.allowed-words.ts";
import { GamesTable } from "./games.table.ts";
import { ANSWER, PUZZLE_ID, emptyAttempt, rankPlayers, selectionKey, summarize, type Attempt } from "./games.logic.ts";

export class GamesRepository extends Context.Service<GamesRepository>()("wedding/GamesRepository", {
  make: Effect.gen(function* () {
    const { db } = yield* Database;
    return { execute: (identity: { firstName: string; lastName: string }, action: "state" | "join" | "start" | "submit", input?: Submit) => db.transaction(tx => Effect.gen(function* () {
      // Keep eligibility stable during the transaction. The unique participant
      // key serializes first joins; FOR UPDATE serializes subsequent guesses.
      const [guest] = yield* tx.select().from(GuestTable).where(eq(GuestTable.normalizedName, toGuestFullName(identity.firstName, identity.lastName))).for("share");
      if (!guest || guest.invitationStatus !== "Yes") return yield* new HttpApiError.Forbidden({});
      const where = and(eq(GamesTable.guestId, guest.id), eq(GamesTable.puzzleId, PUZZLE_ID));
       if (action === "state" || action === "join") yield* tx.insert(GamesTable).values({ guestId: guest.id, puzzleId: PUZZLE_ID, attempt: emptyAttempt() }).onConflictDoNothing();
      let [row] = yield* tx.select().from(GamesTable).where(where).for("update");
      if (action === "submit" || action === "start") {
        if (!row || !input) return yield* new HttpApiError.BadRequest({});
        if (input.expectedRevision !== row.revision) return yield* new HttpApiError.Conflict({});
        const attempt: Attempt = structuredClone(row.attempt);
        const state = summarize(attempt);
        const now = Date.now();
        // A legacy attempt already in progress cannot be assigned a fabricated start time.
        const untouched = input.game === "wordle" ? !attempt.guesses.length : !attempt.selections.length;
        if (state[input.game].status !== "completed" && untouched && !attempt.timing?.[input.game]) {
          attempt.timing = { ...attempt.timing, [input.game]: { startedAt: now, finishedAt: null } };
        }
        if (action === "start") {
          if (input.words.length !== 0) return yield* new HttpApiError.BadRequest({});
        } else if (input.game === "wordle") {
          const word = input.words[0]?.trim().toUpperCase() ?? "";
          if (state.wordle.status === "completed" || input.words.length !== 1 || !/^[A-Z]{5}$/.test(word) || (word !== ANSWER && !WORDLE_ALLOWED_WORD_SET.has(word))) return yield* new HttpApiError.BadRequest({});
          attempt.guesses.push(word);
        } else {
          const words = input.words.map(w => w.trim().toUpperCase()).sort();
          if (state.connections.status === "completed" || words.length !== 4 || new Set(words).size !== 4 || words.some(w => !state.connections.words.includes(w))) return yield* new HttpApiError.BadRequest({});
          // Identical unsuccessful guesses are a no-op, not another mistake.
          if (!attempt.selections.some(s => selectionKey(s) === selectionKey(words))) attempt.selections.push(words);
        }
        const clock = attempt.timing?.[input.game];
        if (clock && clock.finishedAt === null && summarize(attempt)[input.game].status === "completed") clock.finishedAt = now;
        const changed = JSON.stringify(attempt) !== JSON.stringify(row.attempt);
        if (changed) [row] = yield* tx.update(GamesTable).set({ attempt, revision: row.revision + 1 }).where(where).returning();
      }
      const players = yield* tx.select({ name: GuestTable.displayName, attempt: GamesTable.attempt }).from(GamesTable).innerJoin(GuestTable, eq(GuestTable.id, GamesTable.guestId)).where(and(eq(GamesTable.puzzleId, PUZZLE_ID), eq(GuestTable.invitationStatus, "Yes")));
      return { puzzleId: PUZZLE_ID, joined: !!row, revision: row?.revision ?? 0, ...summarize(row?.attempt ?? emptyAttempt()), leaderboard: rankPlayers(players) };
    })).pipe(Effect.mapError(error => error instanceof HttpApiError.Forbidden || error instanceof HttpApiError.BadRequest || error instanceof HttpApiError.Conflict ? error : new HttpApiError.InternalServerError({}))) };
  }),
}) { static readonly layer = Layer.effect(GamesRepository)(GamesRepository.make); }
