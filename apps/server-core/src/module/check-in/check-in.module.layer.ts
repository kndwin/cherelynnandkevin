import { Layer } from "effect";
import { CheckInHttpHandlersLive } from "@/module/check-in/check-in.http.handlers.ts";
import { CheckInService } from "@/module/check-in/check-in.service.default.ts";
import { GuestRepository } from "@/module/check-in/guest.repository.default.ts";

const CheckInServiceProvidedLive = CheckInService.layer.pipe(Layer.provide(GuestRepository.layer));

export const CheckInModuleLive = CheckInHttpHandlersLive.pipe(
  Layer.provide(Layer.mergeAll(CheckInServiceProvidedLive, GuestRepository.layer)),
);
