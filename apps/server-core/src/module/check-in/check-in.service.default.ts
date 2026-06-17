import type { CheckInCreateRequest } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Context, Effect, Layer } from "effect";
import { CheckInRepository } from "@/module/check-in/check-in.repository.default.ts";

export class CheckInService extends Context.Service<CheckInService>()(
  "cherelynnandkevin/server-core/module/check-in/CheckInService",
  {
    make: Effect.gen(function* () {
      const repository = yield* CheckInRepository;

      return {
        create: Effect.fn("CheckInService.create")(function* ({
          input,
        }: {
          readonly input: CheckInCreateRequest;
        }) {
          return yield* repository.appendToSpreadsheet({ input });
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<CheckInService, never, CheckInRepository> = Layer.effect(CheckInService)(
    CheckInService.make,
  );
}
