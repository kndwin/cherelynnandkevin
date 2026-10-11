import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required");
}

// Run every ordered migration idempotently. Each file is written with
// IF NOT EXISTS guards so reruns are safe; files execute in lexical order
// inside a single transaction per file.
const migrationsDir = join(import.meta.dir, "../../migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  throw new Error(`No migrations found in ${migrationsDir}`);
}

const db = new Bun.SQL(databaseUrl);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  await db.begin(async (tx) => {
    await tx.unsafe(sql);
  });
  console.log(`Applied ${file}`);
}

await db.close();
console.log("Migrations applied");
