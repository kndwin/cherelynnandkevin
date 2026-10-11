import type { RsvpRespondRequest } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Context, Effect, Layer } from "effect";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";

export class CheckInService extends Context.Service<CheckInService>()(
  "cherelynnandkevin/server-core/module/check-in/CheckInService",
  {
    make: Effect.gen(function* () {
      const repository = yield* GuestRepository;

      return {
        getRsvp: Effect.fn("CheckInService.getRsvp")(function* ({
          firstName,
          lastName,
        }: {
          readonly firstName: string;
          readonly lastName: string;
        }) {
          return yield* repository.getRsvp({ firstName, lastName });
        }),
        respond: Effect.fn("CheckInService.respond")(function* ({
          input,
        }: {
          readonly input: RsvpRespondRequest;
        }) {
          return yield* repository.saveRsvp({ input });
        }),
      } as const;
    }),
  },
) {
  static readonly layer: Layer.Layer<CheckInService, never, GuestRepository> = Layer.effect(CheckInService)(
    CheckInService.make,
  );
}
