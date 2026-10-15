import { createPrivateKey, sign } from "node:crypto";
import { Context, Effect, Layer, Redacted } from "effect";
import { SheetsSyncConfig } from "./sync.config.ts";

export const OwnedWorksheet = "Website Guests";
const tokenUrl = "https://oauth2.googleapis.com/token";
const writeScope = "https://www.googleapis.com/auth/spreadsheets";
export type Snapshot = readonly (readonly string[])[];
type Credentials = { email: string; privateKey: string; spreadsheetId: string };
type Sheet = { properties: { sheetId: number; title: string; gridProperties: { rowCount: number; columnCount: number } } };

// OAuth service-account JWT adapted from git 5fee4b9 guest-allowlist.service.ts.
// Unlike the historical reader, never include transport bodies/causes in errors.
export const replaceOwnedSnapshot = async (credentials: Credentials, rows: Snapshot, transport: typeof fetch = fetch, signal?: AbortSignal) => {
  const seconds = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: credentials.email, scope: writeScope, aud: tokenUrl, iat: seconds, exp: seconds + 3600 })}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), createPrivateKey(credentials.privateKey.replace(/\\n/g, "\n"))).toString("base64url");
  const oauth = await transport(tokenUrl, { method: "POST", signal, headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }) });
  if (!oauth.ok) throw new Error("Google authorization failed");
  const token = await oauth.json() as { access_token?: unknown };
  if (typeof token.access_token !== "string") throw new Error("Google authorization failed");
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(credentials.spreadsheetId)}`;
  const headers = { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" };
  const metadataResponse = await transport(`${base}?fields=sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))`, { headers, signal });
  if (!metadataResponse.ok) throw new Error("Spreadsheet metadata request failed");
  const metadata = await metadataResponse.json() as { sheets?: Sheet[] };
  if (!Array.isArray(metadata.sheets)) throw new Error("Invalid spreadsheet metadata");
  const owned = metadata.sheets.find((sheet) => sheet.properties.title === OwnedWorksheet)?.properties;
  const sheetId = owned?.sheetId ?? Math.max(0, ...metadata.sheets.map((sheet) => sheet.properties.sheetId)) + 1;
  const rowCount = Math.max(1, rows.length, owned?.gridProperties.rowCount ?? 0);
  const columnCount = Math.max(1, rows[0]?.length ?? 0, owned?.gridProperties.columnCount ?? 0);
  const requests: unknown[] = [];
  if (!owned) requests.push({ addSheet: { properties: { sheetId, title: OwnedWorksheet, gridProperties: { rowCount, columnCount } } } });
  else if (rowCount !== owned.gridProperties.rowCount || columnCount !== owned.gridProperties.columnCount) requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { rowCount, columnCount } }, fields: "gridProperties.rowCount,gridProperties.columnCount" } });
  // UpdateCells over the full owned grid clears uncovered stale tail cells in
  // the SAME atomic batch as replacement. No clear-before-write or other tabs.
  // stringValue is RAW text, including strings beginning '=' (never formulaValue).
  requests.push({ updateCells: {
    range: { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: columnCount },
    rows: rows.map((row) => ({ values: row.map((value) => ({ userEnteredValue: { stringValue: value } })) })),
    fields: "userEnteredValue",
  } });
  const response = await transport(`${base}:batchUpdate`, { method: "POST", signal, headers, body: JSON.stringify({ requests }) });
  if (!response.ok) throw new Error("Spreadsheet snapshot write failed");
};

export class SheetsWriter extends Context.Service<SheetsWriter>()("SheetsWriter", {
  make: Effect.gen(function* () {
    const config = yield* SheetsSyncConfig;
    return { write: (rows: Snapshot) => Effect.tryPromise({
      try: (signal) => replaceOwnedSnapshot({ email: Redacted.value(config.email), privateKey: Redacted.value(config.privateKey), spreadsheetId: Redacted.value(config.spreadsheetId) }, rows, fetch, signal),
      catch: () => new Error("Google Sheets sync failed. Check service-account access and configuration."),
    }).pipe(Effect.timeout("60 seconds"), Effect.mapError(() => new Error("Google Sheets sync failed. Check service-account access and configuration."))) };
  }),
}) {
  static readonly layer = Layer.effect(SheetsWriter)(SheetsWriter.make);
}
