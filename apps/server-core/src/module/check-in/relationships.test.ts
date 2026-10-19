import { Effect, Layer, Schema, Exit, FileSystem, Path } from "effect";
import { describe, expect, it } from "vitest";
import { GuestRepository } from "./guest.repository.default.ts";
import { RsvpConflictError } from "./relationship.schema.ts";
import { CheckinGuestNotFoundError, GuestValidationError } from "./guest.schema.ts";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { RelatedMemberSchema, BehalfRsvpRequestSchema } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { AdminMembershipRequestSchema, reciprocalRelationship } from "@cherelynnandkevin/client-api-contract/admin/http";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpPlatform from "effect/unstable/http/HttpPlatform";
import * as Etag from "effect/unstable/http/Etag";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { CheckInHttpApi } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { AdminModuleLive } from "@/module/admin/admin.module.layer.ts";
import { CheckInModuleLive } from "./check-in.module.layer.ts";
import { hasDisposableTestDatabase } from "@/platform/test-database.guard.ts";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { Database } from "@/platform/database.interface.ts";
import { GuestTable } from "./guest.table.ts";
import { RsvpEmailDraftTable } from "./rsvp-email.table.ts";
import { GuestGroupTable, GuestRelationshipTable, RsvpAuditTable } from "./relationship.table.ts";
import { eq, and } from "drizzle-orm";

const hasDatabase = hasDisposableTestDatabase();
const live = GuestRepository.layer.pipe(Layer.provide(DatabaseLive));
const run = <A, E>(effect: Effect.Effect<A, E, GuestRepository>) => Effect.runPromise(effect.pipe(Effect.provide(live)));
const call = <A, E>(f: (repo: GuestRepository["Service"]) => Effect.Effect<A, E>) => run(GuestRepository.pipe(Effect.flatMap(f)));

describe("relationship contracts", () => {
  it("maps directional and symmetric reciprocal labels", () => {
    expect(reciprocalRelationship("Parent")).toBe("Child");
    expect(reciprocalRelationship("Child")).toBe("Parent");
    for (const type of ["Partner", "Sibling", "Family", "Other"] as const) expect(reciprocalRelationship(type)).toBe(type);
  });
  it("strips private fields from related member DTOs", () => {
    const member = Schema.decodeUnknownSync(RelatedMemberSchema)({
      id: "a0818d78-53a7-4b8f-abd6-f3ed22c56570", displayName: "Actual Name", attending: "Yes", rsvpRevision: 2,
      email: "private@example.com", notes: "private", nickname: "internal",
    });
    expect(Object.keys(member).sort()).toEqual(["attending", "displayName", "id", "rsvpRevision"]);
  });
  it("requires a behalf revision and allows omitted notes and membership removal", () => {
    const input = { firstName: "A", lastName: "B", sitePassword: "test", targetId: "a0818d78-53a7-4b8f-abd6-f3ed22c56570", attending: "Yes" };
    expect(Exit.isFailure(Schema.decodeUnknownExit(BehalfRsvpRequestSchema)(input))).toBe(true);
    expect(Exit.isSuccess(Schema.decodeUnknownExit(BehalfRsvpRequestSchema)({ ...input, expectedRevision: 0 }))).toBe(true);
    expect(Schema.decodeUnknownSync(AdminMembershipRequestSchema)({ groupId: null })).toEqual({ groupId: null });
  });
});

describe.runIf(hasDatabase)("relationships (local postgres)", () => {
  it("backfills a clique including Maybe once, preserves RSVPs/audit, and never resurrects cleared links", async () => {
    const migration = readFileSync(new URL("../../../migrations/0007_direct_relationships.sql", import.meta.url), "utf8");
    await Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.transaction((tx) => Effect.gen(function* () {
      const group = (yield* tx.insert(GuestGroupTable).values({ name: "Migration fixture" }).returning())[0]!;
      const guests = yield* tx.insert(GuestTable).values(["Yes", "Yes", "Maybe"].map((invitationStatus, index) => ({ displayName: `Migration ${group.id} ${index}`, normalizedName: `migration ${group.id} ${index}`, invitationStatus, guestType: "Family", ownerKey: "Cher", groupId: group.id, rsvpStatus: "Yes", rsvpNotes: "preserve", rsvpRevision: 7 }))).returning();
      const audit = (yield* tx.insert(RsvpAuditTable).values({ targetGuestId: guests[0]!.id, actorKind: "admin", revision: 7, attendance: "Yes" }).returning())[0]!;
      yield* tx.execute(sql`DELETE FROM relationship_migration_markers WHERE name = 'legacy-group-cliques-v1'`);
      yield* tx.execute(sql.raw(migration));
      const links = (yield* tx.select().from(GuestRelationshipTable)).filter((link) => guests.some((guest) => guest.id === link.guestAId));
      expect(links).toHaveLength(3);
      expect(links.every((link) => link.relationship === "Other")).toBe(true);
      const cleared = links[0]!;
      yield* tx.delete(GuestRelationshipTable).where(and(eq(GuestRelationshipTable.guestAId, cleared.guestAId), eq(GuestRelationshipTable.guestBId, cleared.guestBId)));
      yield* tx.execute(sql.raw(migration));
      expect((yield* tx.select().from(GuestRelationshipTable)).filter((link) => guests.some((guest) => guest.id === link.guestAId))).toHaveLength(2);
      expect((yield* tx.select().from(GuestTable).where(eq(GuestTable.id, guests[0]!.id)))[0]).toMatchObject({ rsvpStatus: "Yes", rsvpNotes: "preserve", rsvpRevision: 7 });
      expect((yield* tx.select().from(RsvpAuditTable).where(eq(RsvpAuditTable.id, audit.id)))[0]).toMatchObject({ revision: 7, attendance: "Yes" });
      for (const guest of guests) yield* tx.delete(GuestTable).where(eq(GuestTable.id, guest.id));
      yield* tx.delete(RsvpAuditTable).where(eq(RsvpAuditTable.id, audit.id));
      yield* tx.delete(GuestGroupTable).where(eq(GuestGroupTable.id, group.id));
    }))), Effect.provide(DatabaseLive)));
  });
    it("enforces HTTP admin sessions and public guest eligibility on every new surface", async () => {
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = previousPassword ?? "local-relationship-test-admin";
    const web = HttpRouter.toWebHandler(Layer.mergeAll(
      AdminModuleLive,
      HttpApiBuilder.layer(CheckInHttpApi).pipe(Layer.provide(CheckInModuleLive)),
    ).pipe(Layer.provide(DatabaseLive), Layer.provide(Layer.mergeAll(
      FileSystem.layerNoop({}), Path.layer, Etag.layer,
      HttpPlatform.layer.pipe(Layer.provide(FileSystem.layerNoop({}))),
    ))), { disableLogger: true });
    const uuid = "a0818d78-53a7-4b8f-abd6-f3ed22c56570";
    const fixtureIds: string[] = [];
    let fixtureGroupId: string | undefined;
    const request = (path: string, method = "GET", body?: unknown, cookie?: string) => web.handler(new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
    try {
      for (const [path, method, body] of [
        ["/admin/groups", "GET", undefined], ["/admin/groups", "POST", { name: "Test" }],
        [`/admin/groups/${uuid}`, "PATCH", { name: "Test" }], [`/admin/groups/${uuid}`, "DELETE", undefined],
        [`/admin/memberships/${uuid}`, "PATCH", { groupId: null }], ["/admin/rsvp-audit", "GET", undefined],
        ["/admin/relationships", "GET", undefined], ["/admin/relationships", "PATCH", { guestId: uuid, relatedGuestId: uuid, relationship: "Other", create: true }],
      ] as const) expect((await request(path, method, body)).status).toBe(401);
      const auth = { firstName: "Missing", lastName: "Guest" };
      expect((await request("/rsvps/related", "POST", auth)).status).toBe(403);
      expect((await request("/rsvps/behalf", "POST", { ...auth, targetId: uuid, attending: "Yes", expectedRevision: 0 })).status).toBe(403);
      expect((await request("/rsvps/related", "POST", { ...auth, sitePassword: "kc27" })).status).toBe(403);
      const login = await request("/admin/login", "POST", { password: process.env.ADMIN_PASSWORD });
      expect(login.status).toBe(200);
      const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
      expect((await request("/admin/groups", "GET", undefined, cookie)).status).toBe(200);
      expect((await request("/admin/rsvp-audit", "GET", undefined, cookie)).status).toBe(200);
      expect((await request("/admin/groups/not-a-uuid", "DELETE", undefined, cookie)).status).toBe(410);
      const suffix = `Http ${Date.now()}-${Math.random()}`;
      const groupResponse = await request("/admin/groups", "POST", { name: suffix }, cookie);
      expect(groupResponse.status).toBe(410);
      for (const firstName of ["HttpActor", "HttpTarget"]) {
        const guestResponse = await request("/admin/guests", "POST", {
          displayName: `${firstName} ${suffix}`, nickname: "private nickname", internalNotes: "private notes",
          invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin",
        }, cookie);
        expect(guestResponse.status).toBe(201);
        const id = (await guestResponse.json()).id as string;
        fixtureIds.push(id);
        expect((await request(`/admin/memberships/${id}`, "PATCH", { groupId: null }, cookie)).status).toBe(410);
      }
      expect((await request("/admin/relationships", "PATCH", { guestId: fixtureIds[0], relatedGuestId: fixtureIds[1], relationship: "Partner", create: true }, cookie)).status).toBe(200);
      const actorAuth = { firstName: "HttpActor", lastName: suffix, sitePassword: "kc27" };
      const relatedResponse = await request("/rsvps/related", "POST", actorAuth);
      expect(relatedResponse.status).toBe(200);
      expect(await relatedResponse.json()).toEqual({ members: [{ id: fixtureIds[1], displayName: `HttpTarget ${suffix}`, attending: "", rsvpRevision: 0, hasEmail: false }] });
      const behalf = { ...actorAuth, targetId: fixtureIds[1], attending: "Yes", expectedRevision: 0 };
      const behalfResponse = await request("/rsvps/behalf", "POST", behalf);
      expect(behalfResponse.status).toBe(200);
      expect(await behalfResponse.json()).toEqual({ id: fixtureIds[1], displayName: `HttpTarget ${suffix}`, attending: "Yes", rsvpRevision: 1, hasEmail: false });
      expect((await request("/rsvps/behalf", "POST", behalf)).status).toBe(409);
      expect((await request(`/admin/guests/${fixtureIds[1]}`, "PATCH", { rsvpStatus: "No", expectedRevision: 0 }, cookie)).status).toBe(409);
      const targetAuth = { firstName: "HttpTarget", lastName: suffix, sitePassword: "kc27" };
      const own = { ...targetAuth, attending: "No", email: "http@example.com", notes: "own", expectedRevision: 0 };
      expect((await request("/rsvps", "POST", own)).status).toBe(409);
      expect((await request("/rsvps", "POST", { ...own, expectedRevision: 1 })).status).toBe(200);
      const authenticated = await request("/rsvps/authenticate", "POST", targetAuth);
      expect(authenticated.status).toBe(200);
      expect((await authenticated.json()).rsvpRevision).toBe(2);
      expect((await request("/admin/relationships", "PATCH", { guestId: fixtureIds[0], relatedGuestId: fixtureIds[1], relationship: null }, cookie)).status).toBe(200);
      expect((await request("/rsvps/behalf", "POST", { ...behalf, expectedRevision: 2 })).status).toBe(403);
    } finally {
      for (const id of fixtureIds) await call((repo) => repo.adminDelete({ id }));
      if (fixtureGroupId) await call((repo) => repo.adminGroupDelete({ id: fixtureGroupId! }));
      await web.dispose();
      if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = previousPassword;
    }
  });

  it("manages groups, applies current permissions, preserves omitted notes, and audits all RSVP paths", async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const ids: string[] = [];
    const groups: string[] = [];
    const create = async (firstName: string, invitationStatus = "Yes") => {
      const row = await call((repo) => repo.adminCreate({ input: { displayName: `${firstName} ${suffix}`, invitationStatus, guestType: "Friends", ownerKey: "Kevin", internalNotes: "secret", nickname: "internal" } }));
      ids.push(row.id);
      return row;
    };
    try {
      const actor = await create("Actor");
      const target = await create("Target");
      const ineligible = await create("Ineligible", "Maybe");
      const outsider = await create("Outsider");
      const group = await call((repo) => repo.adminGroupSave({ name: `Family ${suffix}` }));
      groups.push(group.id);
      await call((repo) => repo.adminGroupSave({ id: group.id, name: `Renamed ${suffix}` }));
      expect((await call((repo) => repo.adminGroups())).find((row) => row.id === group.id)?.name).toBe(`Renamed ${suffix}`);
      for (const guest of [actor, target, ineligible]) await call((repo) => repo.adminMembership({ id: guest.id, groupId: group.id }));
      for (const guest of [target, ineligible]) await call((repo) => repo.adminRelationshipSave({ guestId: actor.id, relatedGuestId: guest.id, relationship: "Other", create: true }));
      await call((repo) => repo.adminRelationshipSave({ guestId: target.id, relatedGuestId: outsider.id, relationship: "Parent", create: true }));
      const directed = (await call((repo) => repo.adminRelationships())).find((link) => [link.guestAId, link.guestBId].includes(target.id) && [link.guestAId, link.guestBId].includes(outsider.id))!;
      expect(directed.guestAId === target.id ? directed.relationship : reciprocalRelationship(directed.relationship as "Parent" | "Child")).toBe("Parent");
      expect((await call((repo) => repo.relatedMembers({ firstName: "Target", lastName: suffix }))).members.map((member) => member.id).sort()).toEqual([actor.id, outsider.id].sort());
      await call((repo) => repo.adminRelationshipSave({ guestId: outsider.id, relatedGuestId: target.id, relationship: "Partner" }));
      expect((await call((repo) => repo.adminRelationships())).find((link) => link.guestAId === directed.guestAId && link.guestBId === directed.guestBId)?.relationship).toBe("Partner");
      expect(await call((repo) => repo.adminRelationshipSave({ guestId: actor.id, relatedGuestId: actor.id, relationship: "Other", create: true }).pipe(Effect.flip))).toBeInstanceOf(GuestValidationError);
      expect(await call((repo) => repo.adminRelationshipSave({ guestId: target.id, relatedGuestId: actor.id, relationship: "Other", create: true }).pipe(Effect.flip))).toBeInstanceOf(GuestValidationError);
      const auth = { firstName: "Actor", lastName: suffix, sitePassword: "test" };
      const related = await call((repo) => repo.relatedMembers(auth));
      expect(related.members).toEqual([{ id: target.id, displayName: target.displayName, attending: "", rsvpRevision: 0, hasEmail: false }]);
      const admin = await call((repo) => repo.adminUpdate({ id: target.id, input: { rsvpNotes: "preserve me", expectedRevision: 0 } }));
      expect(admin.rsvpRevision).toBe(1);
      await call((repo) => repo.adminUpdate({ id: target.id, input: { internalNotes: "unrelated" } }));
      expect((await call((repo) => repo.adminGet({ id: target.id }))).rsvpRevision).toBe(1);
      await call((repo) => repo.adminUpdate({ id: target.id, input: { nickname: "edited", rsvpStatus: "", rsvpEmail: "", rsvpNotes: "preserve me" } }));
      expect((await call((repo) => repo.adminGet({ id: target.id }))).rsvpRevision).toBe(1);
      expect(await call((repo) => repo.adminUpdate({ id: target.id, input: { rsvpStatus: "Yes" } }).pipe(Effect.flip))).toBeInstanceOf(GuestValidationError);
      const behalf = { ...auth, targetId: target.id, attending: "Yes" as const, expectedRevision: 1 };
      const saved = await call((repo) => repo.saveBehalf({ input: behalf }));
      expect(saved.rsvpRevision).toBe(2);
      expect(Object.keys(saved).sort()).toEqual(["attending", "displayName", "hasEmail", "id", "rsvpRevision"]);
      expect((await call((repo) => repo.adminGet({ id: target.id }))).rsvpNotes).toBe("preserve me");
      // No email on file and none given: nothing to send.
      const drafts = () => Effect.runPromise(Database.pipe(Effect.flatMap(({ db }) => db.select().from(RsvpEmailDraftTable).where(eq(RsvpEmailDraftTable.guestId, target.id))), Effect.provide(DatabaseLive)));
      expect(await drafts()).toHaveLength(0);
      expect(await call((repo) => repo.saveBehalf({ input: behalf }).pipe(Effect.flip))).toBeInstanceOf(RsvpConflictError);
      expect(await call((repo) => repo.adminUpdate({ id: target.id, input: { rsvpStatus: "No", expectedRevision: 1 } }).pipe(Effect.flip))).toBeInstanceOf(RsvpConflictError);
      for (const targetId of [outsider.id, ineligible.id, actor.id]) {
        expect(await call((repo) => repo.saveBehalf({ input: { ...behalf, targetId, expectedRevision: 0 } }).pipe(Effect.flip))).toBeInstanceOf(CheckinGuestNotFoundError);
      }
      await call((repo) => repo.adminRelationshipSave({ guestId: actor.id, relatedGuestId: target.id, relationship: null }));
      expect(await call((repo) => repo.saveBehalf({ input: { ...behalf, expectedRevision: 2 } }).pipe(Effect.flip))).toBeInstanceOf(CheckinGuestNotFoundError);
      await call((repo) => repo.adminRelationshipSave({ guestId: actor.id, relatedGuestId: target.id, relationship: "Partner", create: true }));
      await call((repo) => repo.adminUpdate({ id: actor.id, input: { invitationStatus: "Maybe" } }));
      expect(await call((repo) => repo.saveBehalf({ input: { ...behalf, expectedRevision: 2 } }).pipe(Effect.flip))).toBeInstanceOf(CheckinGuestNotFoundError);
      await call((repo) => repo.adminUpdate({ id: actor.id, input: { invitationStatus: "Yes" } }));
      const self = { firstName: "Target", lastName: suffix, sitePassword: "test", attending: "No" as const, email: "self@example.com", notes: "self note", expectedRevision: 2 };
      const selfSaved = await call((repo) => repo.saveRsvp({ input: self }));
      expect(selfSaved.rsvpRevision).toBe(3);
      expect(await call((repo) => repo.saveRsvp({ input: self }).pipe(Effect.flip))).toBeInstanceOf(RsvpConflictError);
      const audits = (await call((repo) => repo.adminAudit())).filter((row) => row.targetGuestId === target.id).sort((a, b) => a.revision - b.revision);
      expect(audits.map((row) => [row.revision, row.actorKind, row.actorGuestId])).toEqual([[1, "admin", null], [2, "guest", actor.id], [3, "guest", target.id]]);
      expect(audits.every((row) => !Number.isNaN(Date.parse(row.createdAt)))).toBe(true);
      // Two simultaneous writers using one revision cannot both win.
      const concurrent = await Promise.all(["Yes", "Yes"].map((attending) => call((repo) => repo.saveBehalf({
        input: { ...behalf, attending: attending as "Yes" | "No", expectedRevision: 3 },
      }).pipe(Effect.result))));
      expect(concurrent.filter((result) => result._tag === "Success")).toHaveLength(1);
      expect(concurrent.filter((result) => result._tag === "Failure")).toHaveLength(1);
      expect((await call((repo) => repo.adminGet({ id: target.id }))).rsvpRevision).toBe(4);
      expect(await call((repo) => repo.saveBehalf({ input: { ...behalf, email: "not-an-email", expectedRevision: 4 } }).pipe(Effect.flip))).toBeInstanceOf(GuestValidationError);
      const withEmail = await call((repo) => repo.saveBehalf({ input: { ...behalf, email: " behalf@example.com ", dietaryRequirements: "Vegetarian", expectedRevision: 4 } }));
      expect(withEmail).toMatchObject({ rsvpRevision: 5, hasEmail: true });
      expect(await call((repo) => repo.adminGet({ id: target.id }))).toMatchObject({ rsvpEmail: "behalf@example.com", dietaryRequirements: "Vegetarian" });
      expect((await drafts()).find((draft) => draft.revision === 5)?.snapshot).toEqual({ displayName: target.displayName, email: "behalf@example.com", attending: "Yes", dietaryRequirements: "Vegetarian" });
      // Blank email and dietary keep the stored values, so the revision is unchanged.
      await call((repo) => repo.saveBehalf({ input: { ...behalf, email: "", dietaryRequirements: "", expectedRevision: 5 } }));
      expect(await call((repo) => repo.adminGet({ id: target.id }))).toMatchObject({ rsvpEmail: "behalf@example.com", dietaryRequirements: "Vegetarian", rsvpRevision: 5 });
      expect((await call((repo) => repo.relatedMembers(auth))).members[0]).toMatchObject({ hasEmail: true });
      await call((repo) => repo.adminGroupDelete({ id: group.id }));
      await call((repo) => repo.adminRelationshipSave({ guestId: actor.id, relatedGuestId: target.id, relationship: null }));
      const preserved = await call((repo) => repo.adminGet({ id: target.id }));
      expect(preserved).toMatchObject({ groupId: null, rsvpNotes: "self note", rsvpRevision: 5 });
      expect(["Yes", "No"]).toContain(preserved.rsvpStatus);
      expect(await call((repo) => repo.relatedMembers(auth))).toEqual({ members: [] });
    } finally {
      for (const id of ids) await call((repo) => repo.adminDelete({ id }));
      for (const id of groups) await call((repo) => repo.adminGroupDelete({ id }).pipe(Effect.catch(() => Effect.succeed({ id }))));
    }
  });
});
