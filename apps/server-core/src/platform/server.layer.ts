import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Config, Effect, Layer } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { AdminModuleLive } from "@/module/admin/admin.module.layer.ts";
import { CheckInModuleLive } from "@/module/check-in/check-in.module.layer.ts";
import { HealthModuleLive } from "@/module/health/health.module.layer.ts";
import { TodoModuleLive } from "@/module/todo/todo.module.layer.ts";
import { DatabaseLive } from "@/platform/database.layer.ts";
import { GamesModuleLive } from "@/module/games/games.module.layer.ts";
import { HttpLive } from "@/platform/http.layer.ts";
import { RsvpEmailDispatcherLive } from "@/module/check-in/rsvp-email.dispatcher.ts";

const Port = Config.number("PORT").pipe(Config.withDefault(3000));

export const BunHttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const port = yield* Port;
    return BunHttpServer.layer({ port });
  }),
);

const AppLive = Layer.merge(HttpLive, RsvpEmailDispatcherLive).pipe(
  Layer.provide(Layer.mergeAll(GamesModuleLive, AdminModuleLive, CheckInModuleLive, HealthModuleLive, TodoModuleLive)),
  Layer.provide(DatabaseLive),
);

export const ServerLive = HttpRouter.serve(AppLive).pipe(Layer.provide(BunHttpServerLive));
