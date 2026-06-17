import { ClientHttpApi } from "@cherelynnandkevin/client-api-contract/client/api";
import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

const baseUrl = import.meta.env.VITE_API_URL ?? "/api";

export class AppHttpClient extends Context.Service<AppHttpClient>()(
  "cherelynnandkevin/engage/platform/AppHttpClient",
  {
    make: HttpApiClient.make(ClientHttpApi, { baseUrl }).pipe(Effect.provide(FetchHttpClient.layer)),
  },
) {
  static readonly layer: Layer.Layer<AppHttpClient> = Layer.effect(AppHttpClient)(AppHttpClient.make);
}
