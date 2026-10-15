import { ConfigProvider, Effect, Exit, FileSystem, Layer, Path, Schema } from "effect";
import { describe, expect, it } from "vitest";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpPlatform from "effect/unstable/http/HttpPlatform";
import * as Etag from "effect/unstable/http/Etag";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { CheckInHttpApi } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { AdminDeleteFailedAttemptsRequestSchema, AdminListFailedAttemptsQuerySchema, AdminUpdateFailedAttemptRequestSchema } from "@cherelynnandkevin/client-api-contract/admin/http";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { OperationsRepository } from "./operations.repository.ts";
import { AdminModuleLive } from "./admin.module.layer.ts";
import { CheckInModuleLive } from "@/module/check-in/check-in.module.layer.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";
import { hasDisposableTestDatabase } from "@/platform/test-database.guard.ts";

const hasDatabase = hasDisposableTestDatabase();
const live = OperationsRepository.layer.pipe(Layer.provide(DatabaseLive));
const call = <A, E>(f: (repo: OperationsRepository["Service"]) => Effect.Effect<A, E>) => Effect.runPromise(OperationsRepository.pipe(Effect.flatMap(f), Effect.provide(live)));
const uuid = "a0818d78-53a7-4b8f-abd6-f3ed22c56570";

describe("operations contracts", () => {
  it("rejects malformed ids, oversized bulk requests, notes and invalid filters", () => {
    for (const ids of [[], ["arbitrary-id"], Array(501).fill(uuid)]) expect(Exit.isFailure(Schema.decodeUnknownExit(AdminDeleteFailedAttemptsRequestSchema)({ ids }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminUpdateFailedAttemptRequestSchema)({ notes: "a".repeat(2001) }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminUpdateFailedAttemptRequestSchema)({ status: "archived" }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminListFailedAttemptsQuerySchema)({ pageSize: "101" }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminListFailedAttemptsQuerySchema)({ page: "1000001" }))).toBe(true);
  });
});

describe.runIf(hasDatabase)("operations (local postgres)", () => {
  it("atomically aggregates concurrent attempts and reopens resolved rows without losing notes or first-seen time", async () => {
    const normalizedName = `operations test ${Date.now()}-${Math.random()}`;
    const ids: string[] = [];
    try {
      await call((repo) => repo.recordFailure({ normalizedName, reason: "wrong-password" }));
      const first = (await call((repo) => repo.list({ pageSize: 100 }))).attempts.find((row) => row.normalizedName === normalizedName)!;
      ids.push(first.id);
      expect(first).toMatchObject({ count: 1, status: "new", notes: "" });
      await call((repo) => repo.update({ id: first.id, input: { status: "resolved", notes: "keep this investigation" } }));
      await Promise.all(Array.from({ length: 20 }, () => call((repo) => repo.recordFailure({ normalizedName, reason: "wrong-password" }))));
      const repeated = await call((repo) => repo.update({ id: first.id, input: {} }));
      expect(repeated).toMatchObject({ id: first.id, count: 21, status: "new", notes: "keep this investigation", firstSeenAt: first.firstSeenAt });
      expect(Date.parse(repeated.lastSeenAt)).toBeGreaterThanOrEqual(Date.parse(first.lastSeenAt));
      await call((repo) => repo.recordFailure({ normalizedName, reason: "ineligible" }));
      const second = (await call((repo) => repo.list({ reason: "ineligible", pageSize: 100 }))).attempts.find((row) => row.normalizedName === normalizedName)!;
      ids.push(second.id);
      expect(second.count).toBe(1);
      expect(await call((repo) => repo.deleteMany({ ids: [first.id, first.id, second.id, uuid] }))).toEqual({ deletedCount: 2 });
      await call((repo) => repo.recordFailure({ normalizedName, reason: "wrong-password" }));
      const fresh = (await call((repo) => repo.list({ pageSize: 100 }))).attempts.find((row) => row.normalizedName === normalizedName)!;
      ids.push(fresh.id);
      expect(fresh).toMatchObject({ count: 1, status: "new", notes: "" });
      expect(await call((repo) => repo.deleteOne({ id: fresh.id }))).toEqual({ deletedCount: 1 });
    } finally {
      await call((repo) => repo.deleteMany({ ids }));
    }
  });

  it("protects every operations route, validates identifiers, and records each public auth denial once", async () => {
    const adminPassword = "local-operations-test-admin";
    const web = HttpRouter.toWebHandler(Layer.mergeAll(
      AdminModuleLive,
      HttpApiBuilder.layer(CheckInHttpApi).pipe(Layer.provide(CheckInModuleLive)),
    ).pipe(Layer.provide(DatabaseLive), Layer.provide(Layer.mergeAll(
      FileSystem.layerNoop({}), Path.layer, Etag.layer,
      HttpPlatform.layer.pipe(Layer.provide(FileSystem.layerNoop({}))),
    )), Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({
      DATABASE_URL: process.env.DATABASE_URL, ADMIN_PASSWORD: adminPassword, NODE_ENV: "development",
    })))), { disableLogger: true });
    const request = (path: string, method = "GET", body?: unknown, cookie?: string) => web.handler(new Request(`http://localhost${path}`, {
      method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
    const base = "/admin/operations/failed-attempts";
    const suffix = `${Date.now()}-${Math.random()}`;
    const names = { firstName: "Operations", lastName: suffix };
    const normalizedName = `operations ${suffix}`;
    const fixtureIds: string[] = [];
    const guestIds: string[] = [];
    try {
      for (const [path, method, body] of [[base, "GET", undefined], [`${base}/${uuid}`, "PATCH", { status: "resolved" }], [`${base}/${uuid}`, "DELETE", undefined], [`${base}/delete`, "POST", { ids: [uuid] }]] as const) {
        expect((await request(path, method, body)).status).toBe(401);
      }
      expect((await request("/admin/syncs")).status).toBe(401);
      expect((await request("/admin/syncs/trigger", "POST")).status).toBe(401);
      const login = await request("/admin/login", "POST", { password: adminPassword });
      const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
      const disabledSync = await request("/admin/syncs", "GET", undefined, cookie);
      expect(disabledSync.status).toBe(200);
      expect(await disabledSync.json()).toMatchObject({ configured: false, configurationStatus: "not-configured" });
      expect((await request("/admin/syncs/trigger", "POST", {}, cookie)).status).toBe(503);
      for (const method of ["PATCH", "DELETE"]) expect((await request(`${base}/not-an-id`, method, method === "PATCH" ? { status: "resolved" } : undefined, cookie)).status).toBe(400);
      expect((await request(`${base}/delete`, "POST", { ids: ["not-an-id"] }, cookie)).status).toBe(400);
      expect((await request(`${base}?pageSize=101`, "GET", undefined, cookie)).status).toBe(400);
      const wrongPassword = { ...names, sitePassword: "never-store-password" };
      expect((await request("/rsvps/authenticate", "POST", wrongPassword)).status).toBe(403);
      expect((await request("/rsvps/related", "POST", wrongPassword)).status).toBe(403);
      expect((await request("/rsvps/behalf", "POST", { ...wrongPassword, targetId: uuid, attending: "Yes", expectedRevision: 0 })).status).toBe(403);
      expect((await request("/rsvps", "POST", { ...wrongPassword, attending: "Yes", email: "ops@example.com", notes: "", expectedRevision: 0 })).status).toBe(403);
      const auth = names;
      expect((await request("/rsvps/authenticate", "POST", auth)).status).toBe(403);
      const createGuest = async (firstName: string, invitationStatus: "Yes" | "Maybe") => {
        const response = await request("/admin/guests", "POST", { displayName: `${firstName} ${suffix}`, invitationStatus, guestType: "Friends", ownerKey: "Kevin" }, cookie);
        expect(response.status).toBe(201);
        const id = (await response.json()).id as string;
        guestIds.push(id);
        return id;
      };
      const actorId = await createGuest(names.firstName, "Maybe");
      expect((await request("/rsvps/related", "POST", auth)).status).toBe(403);
      expect((await request(`/admin/guests/${actorId}`, "PATCH", { invitationStatus: "Yes" }, cookie)).status).toBe(200);
      expect((await request("/rsvps/related", "POST", auth)).status).toBe(200);
      // Target permission denials are not actor authentication failures.
      expect((await request("/rsvps/behalf", "POST", { ...auth, targetId: uuid, attending: "Yes", expectedRevision: 0 })).status).toBe(403);
      const listedResponse = await request(`${base}?pageSize=100`, "GET", undefined, cookie);
      expect(listedResponse.status).toBe(200);
      const listed = await listedResponse.json();
      expect(JSON.stringify(listed)).not.toContain("never-store-password");
      const attempts = listed.attempts.filter((row: { normalizedName: string }) => row.normalizedName === normalizedName);
      expect(attempts.map((row: { reason: string; count: number }) => [row.reason, row.count]).sort()).toEqual([["ineligible", 1], ["name-not-found", 5]]);
      fixtureIds.push(...attempts.map((row: { id: string }) => row.id));
      expect(Object.keys(attempts[0]).sort()).toEqual(["count", "firstSeenAt", "id", "lastSeenAt", "normalizedName", "notes", "reason", "status"]);
      const updated = await request(`${base}/${fixtureIds[0]}`, "PATCH", { status: "resolved", notes: "investigated" }, cookie);
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({ status: "resolved", notes: "investigated" });
      const deletedOne = await request(`${base}/${fixtureIds[0]}`, "DELETE", undefined, cookie);
      expect(await deletedOne.json()).toEqual({ deletedCount: 1 });
      const deletedMany = await request(`${base}/delete`, "POST", { ids: fixtureIds }, cookie);
      expect(deletedMany.status).toBe(200);
      expect(await deletedMany.json()).toEqual({ deletedCount: 1 });
    } finally {
      // Also find fixtures if an earlier assertion failed before collecting ids.
      const rows = (await call((repo) => repo.list({ pageSize: 100 }))).attempts.filter((row) => row.normalizedName === normalizedName);
      await call((repo) => repo.deleteMany({ ids: [...fixtureIds, ...rows.map((row) => row.id)] }));
      for (const id of guestIds) await Effect.runPromise(GuestRepository.pipe(Effect.flatMap((repo) => repo.adminDelete({ id })), Effect.provide(GuestRepository.layer.pipe(Layer.provide(DatabaseLive)))));
      await web.dispose();
    }
  });
});
