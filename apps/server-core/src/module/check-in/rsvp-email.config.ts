import { Config, Context, Effect, Layer, Redacted } from "effect";

export class RsvpEmailConfig extends Context.Service<RsvpEmailConfig>()("RsvpEmailConfig", {
  make: Effect.gen(function* () {
    const enabled = yield* Config.boolean("RSVP_EMAIL_ENABLED").pipe(Config.withDefault(false));
    const accountId = yield* Config.string("CLOUDFLARE_ACCOUNT_ID").pipe(Config.withDefault(""));
    const token = yield* Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN").pipe(Config.withDefault(Redacted.make("")));
    const from = yield* Config.string("RSVP_EMAIL_FROM").pipe(Config.withDefault(""));
    const replyTo = yield* Config.string("RSVP_EMAIL_REPLY_TO").pipe(Config.withDefault(""));
    if (enabled && (!/^[a-f0-9]{32}$/i.test(accountId) || !Redacted.value(token).trim() || !validAddress(from) || (replyTo !== "" && !validAddress(replyTo)))) {
      return yield* Effect.fail(new Error("RSVP email enabled but configuration is incomplete or invalid"));
    }
    return { enabled, accountId, token, from, replyTo };
  }),
}) {
  static readonly layer = Layer.effect(RsvpEmailConfig)(RsvpEmailConfig.make);
}

const validAddress = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254;
