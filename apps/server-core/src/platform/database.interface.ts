import { Context } from "effect";
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import type { DatabaseRelations } from "@/platform/database.relations.ts";
import type { DatabaseConfig } from "@/platform/database.schema.ts";

export class Database extends Context.Service<
  Database,
  {
    readonly config: DatabaseConfig;
    readonly db: EffectPgDatabase<DatabaseRelations>;
  }
>()("cherelynnandkevin/server-core/platform/Database") {}
