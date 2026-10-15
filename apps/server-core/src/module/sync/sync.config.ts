import { Config, Context, Effect, Layer, Redacted } from "effect";

const optionalSecret = (name: string) => Config.redacted(name).pipe(Config.withDefault(Redacted.make("")));

export class SheetsSyncConfig extends Context.Service<SheetsSyncConfig>()("SheetsSyncConfig", {
  make: Effect.gen(function* () {
    const email = yield* optionalSecret("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = yield* optionalSecret("GOOGLE_PRIVATE_KEY");
    const spreadsheetId = yield* optionalSecret("GOOGLE_SHEETS_SPREADSHEET_ID");
    return {
      email, privateKey, spreadsheetId,
      configured: [email, privateKey, spreadsheetId].every((value) => Redacted.value(value).trim().length > 0),
    };
  }),
}) {
  static readonly layer = Layer.effect(SheetsSyncConfig)(SheetsSyncConfig.make);
}
