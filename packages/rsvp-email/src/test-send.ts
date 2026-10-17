import { renderConfirmation } from "./index.ts";

export interface TestSendConfig { accountId: string; from: string; to: string; token: string }
export function validateTestSend(config: TestSendConfig): void {
  const address = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
  if (!/^[a-f0-9]{32}$/i.test(config.accountId)) throw new Error("Invalid account ID (expected 32 hexadecimal characters).");
  if (!address.test(config.from) || !address.test(config.to)) throw new Error("Sender and recipient must be bare email addresses.");
  if (!config.token || /\s/.test(config.token)) throw new Error("Set CLOUDFLARE_EMAIL_API_TOKEN to a nonempty token without whitespace.");
}

// Isolated from server dependencies, database and dispatcher. Never retry a send.
export async function sendSyntheticConfirmation(config: TestSendConfig, http: typeof fetch = fetch): Promise<"accepted" | "failed" | "unknown"> {
  validateTestSend(config);
  const message = await renderConfirmation({ displayName: "Synthetic Test Guest (not a real RSVP)", email: config.to, attending: "Yes", dietaryRequirements: "Synthetic test only: vegetarian; no real guest dietary information" });
  try {
    const response = await http(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`, {
      method: "POST", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [config.to], ...message }),
    });
    if (response.status >= 500) return "unknown";
    if (response.status >= 400 && response.status < 500) return "failed";
    const body: unknown = await response.json();
    if (!response.ok || typeof body !== "object" || body === null || !("success" in body) || body.success !== true || !("result" in body) || typeof body.result !== "object" || body.result === null) return "unknown";
    const result = body.result as Record<string, unknown>;
    const contains = (key: string) => Array.isArray(result[key]) && result[key].includes(config.to);
    if (contains("permanent_bounces") || contains("suppressed_recipients")) return "failed";
    return contains("queued") || contains("delivered") ? "accepted" : "unknown";
  } catch { return "unknown"; }
}
