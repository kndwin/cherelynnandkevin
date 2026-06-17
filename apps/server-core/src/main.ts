import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { ServerLive } from "@/platform/server.layer.ts";

BunRuntime.runMain(Layer.launch(ServerLive as Layer.Layer<never>));
