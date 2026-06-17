import { readFileSync } from "node:fs";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required");
}

const sql = readFileSync(join(import.meta.dir, "../../migrations/0001_create_todos.sql"), "utf8");
const db = new Bun.SQL(databaseUrl);

await db.begin(async (tx) => {
  await tx.unsafe(sql);
});

await db.close();
console.log("Migrations applied");
