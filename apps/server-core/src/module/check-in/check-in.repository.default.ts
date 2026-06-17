import type { CheckInCreateRequest } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Context, DateTime, Effect, Layer } from "effect";

export class CheckInRepository extends Context.Service<CheckInRepository>()(
  "cherelynnandkevin/server-core/module/check-in/CheckInRepository",
  {
    make: Effect.gen(function* () {
      return {
        appendToSpreadsheet: Effect.fn("CheckInRepository.appendToSpreadsheet")(function* ({
          input,
        }: {
          readonly input: CheckInCreateRequest;
        }) {
          const checkedInAtDateTime = yield* DateTime.now;
          const checkedInAt = DateTime.formatIso(checkedInAtDateTime);
          const id = `mock-google-sheet-row-${checkedInAt}`;

          yield* Effect.logInfo("Mock Google Sheets check-in append", {
            id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
          });

          return {
            id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            checkedInAt,
            spreadsheetStatus: "mocked" as const,
          };
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<CheckInRepository> = Layer.effect(CheckInRepository)(CheckInRepository.make);
}
