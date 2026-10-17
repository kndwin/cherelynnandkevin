export type SendOutcome = "accepted" | "failed" | "unknown" | "throttled";
export interface EmailRequest { from: string; to: string; replyTo: string; subject: string; html: string; text: string }

// No SDK retries: this API has no documented provider-side idempotency guarantee.
export type EmailHttp = (input: string, init: RequestInit) => Promise<Response>;
export async function sendEmail(accountId: string, token: string, email: EmailRequest, http: EmailHttp = fetch): Promise<SendOutcome> {
  try {
    const response = await http(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
      method: "POST", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: email.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, ...(email.replyTo ? { reply_to: email.replyTo } : {}) }),
    });
    if (response.status >= 500) return "unknown";
    const body = await response.json() as { success?: boolean; errors?: { code: number }[]; result?: Record<string, unknown> };
    if (response.status === 429) return body.success === false && body.errors?.some((e) => e.code === 10004) ? "throttled" : "unknown";
    if (response.status >= 400 && response.status < 500) return "failed";
    if (!response.ok || body.success !== true || !body.result) return "unknown";
    const result = body.result;
    const contains = (key: string) => Array.isArray(result[key]) && (result[key] as unknown[]).includes(email.to);
    if (contains("permanent_bounces") || contains("suppressed_recipients")) return "failed";
    if (contains("delivered") || contains("queued")) return "accepted";
    return "unknown";
  } catch { return "unknown"; }
}
