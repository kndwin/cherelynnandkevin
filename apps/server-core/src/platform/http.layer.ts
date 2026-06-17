import { HealthHttpApi } from "@cherelynnandkevin/client-api-contract/health/http";
import { CheckInHttpApi } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { TodoHttpApi } from "@cherelynnandkevin/client-api-contract/todo/http";
import { Layer } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { HttpApiBuilder } from "effect/unstable/httpapi";

const CorsLive = HttpRouter.cors({
  allowedOrigins: [
    "https://cherelynnandkevin.com",
    "https://www.cherelynnandkevin.com",
    "https://engage.cherelynnandkevin.com",
    "https://wedding.cherelynnandkevin.com",
    "https://cherelynnandkevin-client-engage-web.pages.dev",
    "https://cherelynnandkevin-client-wedding-web.pages.dev",
    "https://engage.cherelynnandkevin.localhost",
    "https://wedding.cherelynnandkevin.localhost",
  ],
  allowedMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["accept", "authorization", "b3", "baggage", "content-type", "traceparent", "tracestate"],
  maxAge: 86400,
});

export const HttpLive = Layer.mergeAll(
  HttpApiBuilder.layer(HealthHttpApi, {
    openapiPath: "/openapi.json",
  }),
  HttpApiBuilder.layer(CheckInHttpApi),
  HttpApiBuilder.layer(TodoHttpApi),
).pipe(Layer.provide(CorsLive));
