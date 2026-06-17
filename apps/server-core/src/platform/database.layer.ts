import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Effect, Layer } from "effect";
import { Database } from "@/platform/database.interface.ts";
import { DatabaseRelations } from "@/platform/database.relations.ts";

const DatabaseUrl = Config.string("DATABASE_URL");
const RedactedDatabaseUrl = Config.redacted("DATABASE_URL");

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const url = yield* DatabaseUrl;
    const db = yield* PgDrizzle.makeWithDefaults({ relations: DatabaseRelations });

    return Database.of({
      config: { url },
      db,
    });
  }),
).pipe(Layer.provide(PgClient.layerConfig({ url: RedactedDatabaseUrl })));
