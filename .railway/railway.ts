import { defineRailway, group, postgres, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const isProduction = ctx.isEnvironment("production");
  const singaporeRegion = "asia-southeast1-eqsg3a";
  const database = postgres("Postgres");

  const api = service("server-core", {
    build:
      "curl -fsSL https://bun.sh/install | bash && export BUN_INSTALL=$HOME/.bun && export PATH=$BUN_INSTALL/bin:$PATH && bun --version && pnpm install --frozen-lockfile && pnpm --filter @cherelynnandkevin/server-core check",
    start:
      "export BUN_INSTALL=$HOME/.bun && export PATH=$BUN_INSTALL/bin:$PATH && pnpm --filter @cherelynnandkevin/server-core migrate:prod && pnpm --filter @cherelynnandkevin/server-core start",
    deploy: {
      multiRegionConfig: {
        [singaporeRegion]: { numReplicas: isProduction ? 1 : 1 },
      },
      healthcheckPath: "/live",
      healthcheckTimeout: 300,
    },
    env: {
      DATABASE_URL: database.env.DATABASE_URL,
      NODE_ENV: isProduction ? "production" : "development",
    },
  });

  const backend = group("Backend", [database, api]);

  return project("cherelynnandkevin", {
    resources: [backend],
  });
});
