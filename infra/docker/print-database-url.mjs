import { execFileSync } from "node:child_process";

const output = execFileSync(
  "docker",
  ["compose", "-f", "infra/docker/docker-compose.yml", "port", "postgres", "5432"],
  { encoding: "utf8" },
).trim();

if (output.length === 0) {
  throw new Error("Postgres is not running. Run pnpm infra:db:up first.");
}

const port = output.split(":").at(-1);
console.log(`DATABASE_URL=postgres://postgres:postgres@localhost:${port}/cherelynnandkevin`);
