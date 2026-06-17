import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Config, Effect, Layer } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { CheckInModuleLive } from "@/module/check-in/check-in.module.layer.ts";
import { HealthModuleLive } from "@/module/health/health.module.layer.ts";
import { TodoModuleLive } from "@/module/todo/todo.module.layer.ts";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { HttpLive } from "@/platform/http.layer.ts";

const Port = Config.number("PORT").pipe(Config.withDefault(3000));

export const BunHttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const port = yield* Port;
    return BunHttpServer.layer({ port });
  }),
);

const AppLive = HttpLive.pipe(
  Layer.provide(Layer.mergeAll(CheckInModuleLive, HealthModuleLive, TodoModuleLive)),
  Layer.provide(DatabaseLive),
);

export const ServerLive = HttpRouter.serve(AppLive).pipe(Layer.provide(BunHttpServerLive));
