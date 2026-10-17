import { ConfigProvider, Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RsvpEmailConfig } from "./rsvp-email.config.ts";
import { sendEmail } from "./rsvp-email.provider.ts";
import { completion } from "./rsvp-email.dispatcher.ts";

const email = { from: "sender@example.com", to: "guest@example.com", replyTo: "", subject: "RSVP", html: "<p>Yes</p>", text: "Yes" };
const config = (values: Record<string, string>) => Effect.runPromise(RsvpEmailConfig.make.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(values)))));
describe("RSVP delivery configuration", () => {
  it("defaults disabled and rejects incomplete enabled configuration", async () => {
    expect((await config({})).enabled).toBe(false);
    await expect(config({ RSVP_EMAIL_ENABLED: "true" })).rejects.toThrow();
  });
});
describe("Cloudflare outcomes (mock HTTP only)", () => {
  for (const [status, body, expected] of [
    [200, { success: true, result: { queued: [email.to] } }, "accepted"],
    [200, { success: true, result: { delivered: [email.to] } }, "accepted"],
    [200, { success: true, result: { permanent_bounces: [email.to] } }, "failed"],
    [200, { success: true, result: { suppressed_recipients: [email.to] } }, "failed"],
    [200, { success: true, result: {} }, "unknown"],
    [500, {}, "unknown"], [403, { success: false }, "failed"],
    [429, { success: false, errors: [{ code: 10004 }] }, "throttled"],
    [429, {}, "unknown"],
  ] as const) it(`${status} ${expected} ${JSON.stringify(body)}`, async () => {
    let calls = 0;
    const http = async () => { calls++; return new Response(JSON.stringify(body), { status }); };
    expect(await sendEmail("account", "mock-token", email, http)).toBe(expected);
    expect(calls).toBe(1);
  });
  it("holds network and malformed outcomes without retry", async () => {
    expect(await sendEmail("account", "mock-token", email, async () => { throw new Error("timeout"); })).toBe("unknown");
    expect(await sendEmail("account", "mock-token", email, async () => new Response("bad"))).toBe("unknown");
  });
  it("bounds throttle retries and holds unknown outcomes", () => {
    const now = new Date(0);
    expect(completion("throttled", 1, now)).toEqual({ status: "pending", nextAttemptAt: new Date(60_000) });
    expect(completion("throttled", 2, now).nextAttemptAt).toEqual(new Date(120_000));
    expect(completion("throttled", 3, now).status).toBe("failed");
    expect(completion("unknown", 1, now).status).toBe("unknown");
  });
});
