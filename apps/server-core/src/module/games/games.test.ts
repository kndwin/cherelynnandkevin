import { describe, expect, it } from "vitest";
import { Effect, Layer, Exit, FileSystem, Path } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpPlatform from "effect/unstable/http/HttpPlatform";
import * as Etag from "effect/unstable/http/Etag";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { GamesHttpApi } from "@cherelynnandkevin/client-api-contract/games/http";
import { GamesModuleLive } from "./games.module.layer.ts";
import { randomUUID } from "node:crypto";
import { Database } from "../../platform/database.interface.ts";
import { DatabaseLive } from "../../platform/database.layer.ts";
import { hasDisposableTestDatabase } from "../../platform/test-database.guard.ts";
import { GuestTable } from "../check-in/guest.table.ts";
import { toGuestFullName } from "../check-in/guest-name.ts";
import { GamesRepository } from "./games.repository.ts";
import { ANSWER, GROUPS, emptyAttempt, rankPlayers, scoreGuess, summarize } from "./games.logic.ts";

describe("wedding games scoring", () => {
  it("scores repeated letters without reusing answer letters", () => {
    expect(scoreGuess("EERIE", "SPEED")).toEqual(["present", "present", "absent", "absent", "absent"]);
    expect(scoreGuess("VOWED")).toEqual(Array(5).fill("correct"));
  });
  it("scores wins, six-guess losses and both completion bonuses", () => {
    expect(summarize({ guesses: [ANSWER], selections: [] }).wordle.score).toBe(6);
    expect(summarize({ guesses: Array(6).fill("SPEED"), selections: [] }).wordle).toMatchObject({ status: "completed", score: 0, answer: ANSWER });
    const selections = GROUPS.map(g => [...g.words]);
    expect(summarize({ guesses: [], selections }).connections.score).toBe(6);
    expect(summarize({ guesses: [], selections: [["LATTE","RING","VOW","MAP"], ...selections] }).connections.score).toBe(5);
    expect(summarize({ guesses: [], selections: Array(4).fill(["LATTE","RING","VOW","MAP"]) }).connections.status).toBe("completed");
  });
  it("uses shared competition rank and alphabetic ties; leaks no private fields", () => {
    const rows = rankPlayers([{ name: "Zed", attempt: emptyAttempt() }, { name: "Ada", attempt: emptyAttempt() }, { name: "Winner", attempt: { guesses: [ANSWER], selections: [] } }]);
    expect(rows.map(r => [r.name,r.rank])).toEqual([["Winner",1],["Ada",2],["Zed",2]]);
    expect(Object.keys(rows[0]).sort()).toEqual(["connections","elapsedMs","name","rank","status","total","wordle"]);
    expect(summarize(emptyAttempt()).connections.reveal).toEqual([]);
    expect(summarize(emptyAttempt()).wordle.answer).toBeNull();
  });
  it("breaks equal scores by completed server time, preserves true ties and leaves legacy time unknown", () => {
    const timed = (duration: number) => ({ guesses: [ANSWER], selections: GROUPS.map(g => [...g.words]), timing: { wordle: { startedAt: 1000, finishedAt: 1000 + duration }, connections: { startedAt: 2000, finishedAt: 2000 + duration } } });
    const rows = rankPlayers([{ name: "Slow", attempt: timed(5000) }, { name: "Legacy", attempt: { guesses: [ANSWER], selections: GROUPS.map(g => [...g.words]) } }, { name: "Fast", attempt: timed(2000) }, { name: "Also fast", attempt: timed(2000) }]);
    expect(rows.map(p => [p.name, p.rank, p.elapsedMs])).toEqual([["Also fast", 1, 4000], ["Fast", 1, 4000], ["Slow", 3, 10000], ["Legacy", 4, null]]);
    expect(summarize({ ...emptyAttempt(), timing: { wordle: { startedAt: 1000, finishedAt: null } } }, 3500).wordle).toMatchObject({ status: "in-progress", elapsedMs: 2500 });
    expect(summarize(timed(2000), 999999).wordle.elapsedMs).toBe(2000);
  });
});

const hasDatabase = hasDisposableTestDatabase();
describe.runIf(hasDatabase)("wedding games persistence and authorization (disposable postgres)", () => {
  const live = GamesRepository.layer.pipe(Layer.provide(DatabaseLive));
  const call = <A,E>(f: (repo: GamesRepository["Service"]) => Effect.Effect<A,E>) => Effect.runPromise(GamesRepository.pipe(Effect.flatMap(f), Effect.provide(live)));
  it("starts clocks once, resumes across requests and freezes time at completion", async () => {
    const identity = { firstName: `Timed${randomUUID()}`, lastName: "Fixture" };
    await Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.insert(GuestTable).values({ displayName: `${identity.firstName} Fixture`, normalizedName: toGuestFullName(identity.firstName, identity.lastName), invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" })), Effect.provide(DatabaseLive)));
    await call(r => r.execute(identity, "join"));
    const input = { ...identity, expectedRevision: 0, game: "wordle" as const, words: [] };
    const started = await call(r => r.execute(identity, "start", input));
    expect(started.wordle).toMatchObject({ status: "in-progress", guesses: [] });
    expect(started.wordle.elapsedMs).not.toBeNull();
    const resumed = await call(r => r.execute(identity, "start", { ...input, expectedRevision: 1 }));
    expect(resumed.revision).toBe(1);
    expect(resumed.wordle.elapsedMs!).toBeGreaterThanOrEqual(started.wordle.elapsedMs!);
    const finished = await call(r => r.execute(identity, "submit", { ...input, expectedRevision: 1, words: [ANSWER] }));
    const reopened = await call(r => r.execute(identity, "start", { ...input, expectedRevision: 2 }));
    expect(reopened.wordle.elapsedMs).toBe(finished.wordle.elapsedMs);
    expect(reopened.revision).toBe(2);
    expect(reopened.connections.elapsedMs).toBeNull();
  });
  it("requires eligibility, joins once, resumes, serializes revisions, ignores repeated selections and locks terminal games", async () => {
    const firstName = `Games${randomUUID()}`;
    const identity = { firstName, lastName: "Fixture" };
    await Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.insert(GuestTable).values({ displayName: `${firstName} Fixture`, normalizedName: toGuestFullName(firstName,"Fixture"), invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" })), Effect.provide(DatabaseLive)));
    expect(Exit.isFailure(await call(r => Effect.exit(r.execute({ firstName: "Absent", lastName: randomUUID() }, "state"))))).toBe(true);
    expect((await call(r => r.execute(identity,"state"))).joined).toBe(false);
    const joins = await Promise.all([call(r => r.execute(identity,"join")),call(r => r.execute(identity,"join"))]);
    expect(joins.every(s => s.joined && s.revision === 0)).toBe(true);
    const submit = (revision: number, game: "wordle" | "connections", words: string[]) => call(r => r.execute(identity,"submit",{ ...identity, expectedRevision: revision, game, words }));
    await expect(submit(0,"wordle",["ZZZZZ"])).rejects.toBeDefined();
    expect((await call(r => r.execute(identity,"state"))).revision).toBe(0);
    const concurrent = await Promise.allSettled([submit(0,"wordle",["SPEED"]),submit(0,"wordle",["SPEED"])]);
    expect(concurrent.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await call(r => r.execute(identity,"state"))).wordle.guesses).toHaveLength(1);
    await submit(1,"wordle",[ANSWER]);
    await expect(submit(2,"wordle",[ANSWER])).rejects.toBeDefined();
    const bad = ["LATTE","RING","VOW","MAP"];
    const failed = await submit(2,"connections",bad);
    const duplicate = await submit(3,"connections",[...bad].reverse());
    expect(duplicate.revision).toBe(3);
    expect(duplicate.connections.mistakes).toBe(failed.connections.mistakes);
    let revision = 3;
    for (const group of GROUPS) await submit(revision++,"connections",[...group.words]);
    const resumed = await call(r => r.execute(identity,"state"));
    expect(resumed.wordle.score).toBe(5);
    expect(resumed.connections).toMatchObject({ status: "completed", score: 5 });
    await expect(submit(7,"connections",bad)).rejects.toBeDefined();
    expect(resumed.leaderboard.find(p => p.name === `${firstName} Fixture`)).toMatchObject({ total: 10, status: "completed" });
    const maybe = { firstName: `Maybe${randomUUID()}`, lastName: "Fixture" };
    await Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.insert(GuestTable).values({ displayName: `${maybe.firstName} Fixture`, normalizedName: toGuestFullName(maybe.firstName,"Fixture"), invitationStatus: "Maybe", guestType: "Friends", ownerKey: "Kevin" })), Effect.provide(DatabaseLive)));
    for (const action of ["state","join","submit"] as const) expect(Exit.isFailure(await call(r => Effect.exit(r.execute(maybe,action))))).toBe(true);
    const web = HttpRouter.toWebHandler(HttpApiBuilder.layer(GamesHttpApi).pipe(Layer.provide(GamesModuleLive), Layer.provide(DatabaseLive), Layer.provide(Layer.mergeAll(FileSystem.layerNoop({}), Path.layer, Etag.layer, HttpPlatform.layer.pipe(Layer.provide(FileSystem.layerNoop({})))) )), { disableLogger: true });
    const request = (action: string, body: unknown) => web.handler(new Request(`http://localhost/games/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    try {
      expect((await request("state",maybe)).status).toBe(403);
      const response = await request("state",identity);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ puzzleId: "wedding-v1", joined: true, revision: 7 });
      expect((await request("submit",{ ...identity, expectedRevision: 0, game: "wordle", words: [ANSWER] })).status).toBe(409);
      expect((await request("submit",{ ...identity, expectedRevision: 7, game: "wordle", words: [ANSWER] })).status).toBe(400);
    } finally { await web.dispose(); }
  });
  it("ends Wordle after six misses and Connections after four distinct mistakes", async () => {
    const identity = { firstName: `Limits${randomUUID()}`, lastName: "Fixture" };
    await Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.insert(GuestTable).values({ displayName: `${identity.firstName} Fixture`, normalizedName: toGuestFullName(identity.firstName,"Fixture"), invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin" })), Effect.provide(DatabaseLive)));
    await call(r => r.execute(identity,"join"));
    let revision = 0;
    const submit = (game: "wordle" | "connections", words: string[]) => call(r => r.execute(identity,"submit",{ ...identity, expectedRevision: revision++, game, words }));
    for (let i = 0; i < 6; i++) await submit("wordle",["SPEED"]);
    for (const fourth of ["MAP","LOCK","PIANO","KEYBOARD"]) await submit("connections",["RING","LATTE","VIOLET",fourth]);
    const result = await call(r => r.execute(identity,"state"));
    expect(result.wordle).toMatchObject({ status: "completed", score: 0, answer: ANSWER });
    expect(result.connections).toMatchObject({ status: "completed", score: 0, mistakes: 4 });
    expect(result.connections.reveal).toHaveLength(4);
    await expect(submit("connections",[...GROUPS[0].words])).rejects.toBeDefined();
  });
});
