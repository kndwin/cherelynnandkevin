import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { replaceOwnedSnapshot, OwnedWorksheet } from "./sheets.writer.ts";

const credentials = { email: "test@example.invalid", spreadsheetId: "mock-only", privateKey: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs8" }).toString() };

describe("owned Sheets snapshot writer (mock HTTP only)", () => {
  it("uses a write-scope JWT and one atomic replacement batch, clearing stale owned tail without touching other tabs", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(Response.json({ sheets: [
        { properties: { sheetId: 8, title: "Guest List", gridProperties: { rowCount: 100, columnCount: 20 } } },
        { properties: { sheetId: 9, title: OwnedWorksheet, gridProperties: { rowCount: 1000, columnCount: 20 } } },
      ] }))
      .mockResolvedValueOnce(Response.json({}));
    const rows = [["id", "name"], ["uuid", "=IMPORTXML(\"not-a-formula\")"]];
    await replaceOwnedSnapshot(credentials, rows, transport);
    expect(transport).toHaveBeenCalledTimes(3);
    const jwt = new URLSearchParams(transport.mock.calls[0]![1]!.body as URLSearchParams).get("assertion")!;
    const claims = JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString());
    expect(claims.scope).toBe("https://www.googleapis.com/auth/spreadsheets");
    const batch = JSON.parse(transport.mock.calls[2]![1]!.body as string);
    expect(batch.requests).toHaveLength(1);
    expect(batch.requests[0].updateCells.range).toEqual({ sheetId: 9, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 20 });
    expect(batch.requests[0].updateCells.rows[1].values[1]).toEqual({ userEnteredValue: { stringValue: rows[1]![1] } });
    expect(JSON.stringify(batch)).not.toContain("formulaValue");
    expect(JSON.stringify(batch)).not.toContain('"sheetId":8');
    expect(transport.mock.calls.some(([url]) => String(url).includes("clear"))).toBe(false);
  });
  it("creates and populates only the dedicated tab in the same batch when absent", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(Response.json({ sheets: [{ properties: { sheetId: 3, title: "Other", gridProperties: { rowCount: 100, columnCount: 20 } } }] }))
      .mockResolvedValueOnce(Response.json({}));
    await replaceOwnedSnapshot(credentials, [["id"]], transport);
    const batch = JSON.parse(transport.mock.calls[2]![1]!.body as string);
    expect(batch.requests[0].addSheet.properties).toEqual({ sheetId: 4, title: OwnedWorksheet, gridProperties: { rowCount: 1, columnCount: 1 } });
    expect(batch.requests[1].updateCells.range.sheetId).toBe(4);
  });
  it("does not leak Google response bodies into errors or perform a pre-write clear on failure", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("private-provider-response", { status: 403 }));
    await expect(replaceOwnedSnapshot(credentials, [["id"]], transport)).rejects.toThrow("Google authorization failed");
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
