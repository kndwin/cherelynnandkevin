import { Layer } from "effect";
import { CheckInHttpHandlersLive } from "@/module/check-in/check-in.http.handlers.ts";
import { CheckInRepository } from "@/module/check-in/check-in.repository.default.ts";
import { CheckInService } from "@/module/check-in/check-in.service.default.ts";

const CheckInServiceProvidedLive = CheckInService.layer.pipe(Layer.provide(CheckInRepository.layer));

export const CheckInModuleLive = CheckInHttpHandlersLive.pipe(Layer.provide(CheckInServiceProvidedLive));
