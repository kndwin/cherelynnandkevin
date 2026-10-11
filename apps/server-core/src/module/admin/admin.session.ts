import { createHmac, timingSafeEqual } from "node:crypto";

// Hidden admin session: an opaque cookie derived from ADMIN_PASSWORD.
// Format: `<expiresAtSeconds>.<hexHmacSha256(secret, expiresAtSeconds)>`.
// Verification is constant-time over the recomputed MAC and enforces expiry.
// No credentials, tokens, or guest data ever appear in URLs or localStorage.

const AdminSessionCookieName = "ck_admin_session";
const AdminSessionTtlSeconds = 7 * 24 * 60 * 60;

const toExpirySeconds = (nowMs: number): number => Math.floor(nowMs / 1000) + AdminSessionTtlSeconds;

const computeSignature = (secret: string, expiresAtSeconds: number): string =>
  createHmac("sha256", secret).update(String(expiresAtSeconds), "utf8").digest("hex");

const signAdminSession = ({
  secret,
  nowMs,
}: {
  readonly secret: string;
  readonly nowMs: number;
}): string => {
  const expiresAtSeconds = toExpirySeconds(nowMs);
  return `${expiresAtSeconds}.${computeSignature(secret, expiresAtSeconds)}`;
};

const verifyAdminSession = ({
  secret,
  cookieValue,
  nowMs,
}: {
  readonly secret: string;
  readonly cookieValue: string | undefined;
  readonly nowMs: number;
}): boolean => {
  if (secret.length === 0 || cookieValue === undefined || cookieValue.length === 0) {
    return false;
  }
  const separator = cookieValue.indexOf(".");
  if (separator <= 0) {
    return false;
  }
  const expiresAtRaw = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!/^\d+$/.test(expiresAtRaw) || !/^[0-9a-f]{64}$/.test(signature)) {
    return false;
  }
  const expiresAtSeconds = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds * 1000 <= nowMs) {
    return false;
  }
  const expected = computeSignature(secret, expiresAtSeconds);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
};

// Length-equalized constant-time password comparison so the raw secret is
// never compared with early-exit string equality.
const adminPasswordsEqual = (provided: string, expected: string): boolean => {
  if (expected.length === 0 || provided.length === 0) {
    return false;
  }
  const digest = (value: string): Buffer => {
    const hashed = createHmac("sha256", "ck-admin-password-compare").update(value, "utf8").digest();
    return hashed;
  };
  const actual = digest(provided);
  const want = digest(expected);
  return actual.length === want.length && timingSafeEqual(actual, want);
};

export {
  AdminSessionCookieName,
  AdminSessionTtlSeconds,
  adminPasswordsEqual,
  signAdminSession,
  verifyAdminSession,
};
