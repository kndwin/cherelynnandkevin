import { sendSyntheticConfirmation, validateTestSend } from "../src/test-send.ts";

// Environment-only secret: never accept tokens in arguments or an echoed prompt.
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run this command interactively in a terminal.");
  const token = process.env.CLOUDFLARE_EMAIL_API_TOKEN;
  delete process.env.CLOUDFLARE_EMAIL_API_TOKEN;
  if (!token) throw new Error("Set CLOUDFLARE_EMAIL_API_TOKEN using the README hidden-read instructions first.");
  const ask = (variable, label) => process.env[variable]?.trim() || prompt(label)?.trim() || "";
  const config = {
    accountId: ask("CLOUDFLARE_ACCOUNT_ID", "Cloudflare account ID:"),
    from: ask("RSVP_EMAIL_FROM", "Verified bare sender email:"),
    to: ask("RSVP_EMAIL_TEST_TO", "Test recipient email:"),
    token,
  };
  validateTestSend(config);
  console.log(`One REAL email using the actual RSVP template with synthetic guest/dietary details.\nFrom: ${config.from}\nTo: ${config.to}\nNo database, dispatcher, or RSVP_EMAIL_ENABLED is used.`);
  if (prompt("Type SEND to authorize exactly one request:") !== "SEND") {
    console.log("Cancelled. No request sent.");
    return;
  }
  const outcome = await sendSyntheticConfirmation(config);
  if (outcome === "accepted") console.log("Accepted (queued/delivered); inbox delivery is not guaranteed.");
  else {
    console.log(outcome === "failed" ? "Provider rejected the request or reported a failed recipient. No retry performed." : "Outcome unknown. Investigate provider evidence before considering another send; repeating may duplicate email. No retry performed.");
    process.exitCode = 1;
  }
}
main().catch(() => {
  // Deliberately never print exceptions, provider bodies, headers or credentials.
  console.error("Test send stopped. Check terminal, required environment token, account ID and bare addresses. No automatic retry.");
  process.exitCode = 1;
});
