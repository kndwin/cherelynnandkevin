import { expect, it, vi } from "vitest";
import { sendSyntheticConfirmation, validateTestSend } from "./test-send.ts";

const config = { accountId: "a".repeat(32), from: "sender@example.com", to: "recipient@example.com", token: "mock-secret" };
it("renders the real template and submits HTML plus text exactly once", async () => {
  const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true, result: { queued: [config.to] } }));
  expect(await sendSyntheticConfirmation(config, http)).toBe("accepted");
  expect(http).toHaveBeenCalledTimes(1);
  const [url, init] = http.mock.calls[0]!;
  expect(url).toContain(`/accounts/${config.accountId}/email/sending/send`);
  const body = JSON.parse(init!.body as string);
  expect(body.to).toEqual([config.to]);
  expect(body.html).toContain("Synthetic Test Guest");
  expect(body.text).toContain("Synthetic test only: vegetarian");
  expect(body.subject).toBe("Your RSVP is saved — Cherelynn & Kevin");
});
it.each([
  [200, { success: true, result: { delivered: [config.to] } }, "accepted"],
  [200, { success: true, result: { queued: [config.to], suppressed_recipients: [config.to] } }, "failed"],
  [200, { success: true, result: { queued: ["other@example.com"] } }, "unknown"],
  [200, null, "unknown"],
  [429, { success: false }, "failed"],
  [500, {}, "unknown"],
] as const)("classifies %s safely without retries", async (status, body, expected) => {
  const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
  expect(await sendSyntheticConfirmation(config, http)).toBe(expected);
  expect(http).toHaveBeenCalledTimes(1);
});
it("does not retry transport failures or malformed responses", async () => {
  for (const http of [vi.fn<typeof fetch>().mockRejectedValue(new Error("sensitive detail")), vi.fn<typeof fetch>().mockResolvedValue(new Response("not json"))]) {
    expect(await sendSyntheticConfirmation(config, http)).toBe("unknown");
    expect(http).toHaveBeenCalledTimes(1);
  }
});
it("rejects invalid inputs before HTTP", async () => {
  const http = vi.fn<typeof fetch>();
  await expect(sendSyntheticConfirmation({ ...config, from: "Name <sender@example.com>" }, http)).rejects.toThrow("bare email");
  expect(http).not.toHaveBeenCalled();
  expect(() => validateTestSend({ ...config, accountId: "bad" })).toThrow("account ID");
  expect(() => validateTestSend({ ...config, token: "" })).toThrow("TOKEN");
});
