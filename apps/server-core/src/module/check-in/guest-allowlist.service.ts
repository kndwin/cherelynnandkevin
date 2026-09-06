import { Buffer } from "node:buffer";
import { Clock, Config, Context, Effect, Layer, Ref, Result } from "effect";
import { HttpBody, HttpClient, HttpClientRequest } from "effect/unstable/http";

const OAuthTokenUrl = "https://oauth2.googleapis.com/token";
const SheetsReadonlyScope = "https://www.googleapis.com/auth/spreadsheets.readonly";

const SpreadsheetIdConfig = Config.string("GOOGLE_SHEETS_SPREADSHEET_ID");
const GuestListRangeConfig = Config.string("GUEST_LIST_RANGE").pipe(
  Config.withDefault("'Guest List'!A:B"),
);
const ServiceAccountEmailConfig = Config.string("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const PrivateKeyConfig = Config.string("GOOGLE_PRIVATE_KEY").pipe(
  Config.map((value) => value.replace(/\\n/g, "\n")),
);
const CacheTtlMsConfig = Config.number("GUEST_CACHE_TTL_MS").pipe(Config.withDefault(120000));

interface GuestAllowlistCache {
  readonly at: number;
  readonly allowed: ReadonlySet<string>;
}

interface GoogleServiceAccount {
  readonly email: string;
  readonly privateKeyPem: string;
}

const normalizeGuestName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const toGuestFullName = (firstName: string, lastName: string): string =>
  normalizeGuestName(`${firstName} ${lastName}`);

const base64UrlEncode = (input: string | Uint8Array): string =>
  (typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input)).toString("base64url");

const pemToPkcs8Bytes = (pem: string): Uint8Array => {
  const base64 = pem
    .replace(/-----BEGIN [^-]*-----/g, "")
    .replace(/-----END [^-]*-----/g, "")
    .replace(/\s+/g, "");

  return new Uint8Array(Buffer.from(base64, "base64"));
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const bytes = pemToPkcs8Bytes(pem);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
};

const parseGuestAllowlist = (json: unknown): ReadonlySet<string> => {
  if (typeof json !== "object" || json === null) {
    return new Set();
  }

  const values = (json as { readonly values?: unknown }).values;
  if (!Array.isArray(values)) {
    return new Set();
  }

  const allowed = new Set<string>();
  // Skip the header row (Name | Tier).
  for (const row of values.slice(1)) {
    if (!Array.isArray(row)) {
      continue;
    }

    const [rawName, rawTier] = row;
    if (typeof rawTier !== "string" || rawTier.trim() !== "Yes") {
      continue;
    }
    if (typeof rawName !== "string") {
      continue;
    }

    const name = normalizeGuestName(rawName);
    if (name.length > 0) {
      allowed.add(name);
    }
  }

  return allowed;
};

const signServiceAccountJwt = ({
  email,
  privateKeyPem,
}: GoogleServiceAccount): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    const nowSeconds = Math.floor((yield* Clock.currentTimeMillis) / 1000);
    const unsigned = `${base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64UrlEncode(JSON.stringify({ iss: email, scope: SheetsReadonlyScope, aud: OAuthTokenUrl, exp: nowSeconds + 3600, iat: nowSeconds }))}`;

    const key = yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.importKey(
          "pkcs8",
          pemToArrayBuffer(privateKeyPem),
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["sign"],
        ),
      catch: (cause) => new Error(`Failed to import Google service account private key: ${cause}`),
    });
    const signature = yield* Effect.tryPromise({
      try: () => crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(unsigned)),
      catch: (cause) => new Error(`Failed to sign Google service account JWT: ${cause}`),
    });

    return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
  });

const fetchAccessToken = (
  httpClient: HttpClient.HttpClient,
  account: GoogleServiceAccount,
): Effect.Effect<string, unknown> =>
  Effect.gen(function* () {
    const assertion = yield* signServiceAccountJwt(account);
    const body =
      `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(assertion)}`;
    const request = HttpClientRequest.post(OAuthTokenUrl).pipe(
      HttpClientRequest.setBody(HttpBody.text(body, "application/x-www-form-urlencoded")),
    );

    const response = yield* httpClient.execute(request);
    if (response.status !== 200) {
      const text = yield* response.text.pipe(Effect.orElseSucceed(() => "<unreadable body>"));
      return yield* Effect.fail(
        new Error(`Google OAuth token request failed with status ${response.status}: ${text}`),
      );
    }

    const json: unknown = yield* response.json;
    if (
      typeof json !== "object" ||
      json === null ||
      typeof (json as { readonly access_token?: unknown }).access_token !== "string"
    ) {
      return yield* Effect.fail(new Error("Google OAuth token response did not contain access_token"));
    }

    return (json as { readonly access_token: string }).access_token;
  });

const fetchAllowedSet = (
  httpClient: HttpClient.HttpClient,
  config: { readonly spreadsheetId: string; readonly range: string } & GoogleServiceAccount,
): Effect.Effect<ReadonlySet<string>, unknown> =>
  Effect.gen(function* () {
    const token = yield* fetchAccessToken(httpClient, config);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`;
    const request = HttpClientRequest.get(url).pipe(
      HttpClientRequest.setHeader("authorization", `Bearer ${token}`),
      HttpClientRequest.acceptJson,
    );

    const response = yield* httpClient.execute(request);
    if (response.status !== 200) {
      const text = yield* response.text.pipe(Effect.orElseSucceed(() => "<unreadable body>"));
      return yield* Effect.fail(
        new Error(`Google Sheets values request failed with status ${response.status}: ${text}`),
      );
    }

    return parseGuestAllowlist((yield* response.json) as unknown);
  });

export class GuestAllowlist extends Context.Service<GuestAllowlist>()(
  "cherelynnandkevin/server-core/module/check-in/GuestAllowlist",
  {
    make: Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const cache = yield* Ref.make<GuestAllowlistCache | null>(null);

      const loadAllowedSet = Effect.fn("GuestAllowlist.loadAllowedSet")(function* () {
        const spreadsheetId = yield* SpreadsheetIdConfig;
        const range = yield* GuestListRangeConfig;
        const email = yield* ServiceAccountEmailConfig;
        const privateKeyPem = yield* PrivateKeyConfig;
        const cacheTtlMs = yield* CacheTtlMsConfig;
        const now = yield* Clock.currentTimeMillis;
        const cached = yield* Ref.get(cache);
        if (cached !== null && now - cached.at < cacheTtlMs) {
          return cached.allowed;
        }

        const result = yield* Effect.result(fetchAllowedSet(httpClient, { spreadsheetId, range, email, privateKeyPem }));
        if (Result.isSuccess(result)) {
          yield* Ref.set(cache, { at: now, allowed: result.success });
          return result.success;
        }
        if (cached !== null) {
          yield* Effect.logWarning("Guest allowlist refresh failed, using stale cache", result.failure);
          return cached.allowed;
        }

        return yield* Effect.fail(result.failure);
      });

      return {
        isAllowed: Effect.fn("GuestAllowlist.isAllowed")(function* ({
          firstName,
          lastName,
        }: {
          readonly firstName: string;
          readonly lastName: string;
        }) {
          const allowed = yield* loadAllowedSet();
          return allowed.has(toGuestFullName(firstName, lastName));
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<GuestAllowlist, never, HttpClient.HttpClient> = Layer.effect(
    GuestAllowlist,
  )(GuestAllowlist.make);
}

export { normalizeGuestName, parseGuestAllowlist, toGuestFullName };
