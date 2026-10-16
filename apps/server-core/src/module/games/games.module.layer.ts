import { GamesHttpApi } from "@cherelynnandkevin/client-api-contract/games/http";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { GamesRepository } from "./games.repository.ts";
export const GamesModuleLive = HttpApiBuilder.group(GamesHttpApi, "games", Effect.fnUntraced(function* (handlers) {
  const games = yield* GamesRepository;
  return handlers.handle("state", ({ payload }) => games.execute(payload, "state"))
    .handle("join", ({ payload }) => games.execute(payload, "join"))
    .handle("start", ({ payload }) => games.execute(payload, "start", payload))
    .handle("submit", ({ payload }) => games.execute(payload, "submit", payload));
})).pipe(Layer.provide(GamesRepository.layer));
