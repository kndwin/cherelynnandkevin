import { ConfigProvider, Effect, Exit, Layer, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { AdminGuestSchema } from "@cherelynnandkevin/client-api-contract/admin/http";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";
import { CheckinGuestNotFoundError } from "@/module/check-in/guest.schema.ts";
import { SheetsSyncService } from "@/module/sync/sync.service.ts";
import { OperationsRepository } from "./operations.repository.ts";
import { AdminHttpRoutesLive } from "./admin.http.routes.ts";

describe("GET /admin/guests/:id", () => {
  it("requires authentication, returns a schema-valid guest, and maps missing/invalid ids", async () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const missingId = "123e4567-e89b-12d3-a456-426614174001";
    const guest = {
      id, displayName: "Test Guest", nickname: "", invitationStatus: "Yes",
      guestType: "Friends", ownerKey: "Kevin", internalNotes: "",
      rsvpStatus: "", rsvpEmail: "", rsvpNotes: "", rsvpRevision: 0,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const adminGet = vi.fn(({ id: requested }: { id: string }) => requested === id
      ? Effect.succeed(guest)
      : Effect.fail(new CheckinGuestNotFoundError({})));
    // Only adminGet is exercised; other service methods must not be called.
    const web = HttpRouter.toWebHandler(AdminHttpRoutesLive.pipe(
      Layer.provide(Layer.mergeAll(
        Layer.succeed(GuestRepository, { adminGet } as unknown as GuestRepository["Service"]),
        Layer.succeed(OperationsRepository, {} as OperationsRepository["Service"]),
        Layer.succeed(SheetsSyncService, {} as SheetsSyncService["Service"]),
        ConfigProvider.layer(ConfigProvider.fromUnknown({ ADMIN_PASSWORD: "unit-test-only", NODE_ENV: "development" })),
      )),
    ), { disableLogger: true });
    const get = (suffix: string, cookie?: string) => web.handler(new Request(`http://localhost/admin/guests/${suffix}`, {
      headers: cookie ? { cookie } : {},
    }));
    try {
      for (const suffix of [id, missingId, "invalid-id"]) {
        expect((await get(suffix)).status).toBe(401);
      }
      expect(adminGet).not.toHaveBeenCalled();
      const login = await web.handler(new Request("http://localhost/admin/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "unit-test-only" }),
      }));
      expect(login.status).toBe(200);
      const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
      const existing = await get(`${id}?reload=1`, cookie);
      expect(existing.status).toBe(200);
      const json = await existing.json();
      expect(json).toEqual(guest);
      expect(Exit.isSuccess(Schema.decodeUnknownExit(AdminGuestSchema)(json))).toBe(true);
      expect(adminGet).toHaveBeenCalledWith({ id });
      const missing = await get(missingId, cookie);
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ message: "Guest not found" });
      const calls = adminGet.mock.calls.length;
      for (const suffix of ["invalid-id", "%69nvalid-id"]) {
        const invalid = await get(suffix, cookie);
        expect(invalid.status).toBe(400);
        expect(await invalid.json()).toEqual({ message: "Invalid guest id" });
      }
      expect(adminGet.mock.calls.length).toBe(calls);
    } finally {
      await web.dispose();
    }
  });
});
