import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { CheckInHttpHandlersLive } from "@/module/check-in/check-in.http.handlers.ts";
import { CheckInRepository } from "@/module/check-in/check-in.repository.default.ts";
import { CheckInService } from "@/module/check-in/check-in.service.default.ts";
import { GuestAllowlist } from "@/module/check-in/guest-allowlist.service.ts";

const CheckInServiceProvidedLive = CheckInService.layer.pipe(Layer.provide(CheckInRepository.layer));

const GuestAllowlistProvidedLive = GuestAllowlist.layer.pipe(Layer.provide(FetchHttpClient.layer));

export const CheckInModuleLive = CheckInHttpHandlersLive.pipe(
  Layer.provide(Layer.mergeAll(CheckInServiceProvidedLive, GuestAllowlistProvidedLive)),
);
