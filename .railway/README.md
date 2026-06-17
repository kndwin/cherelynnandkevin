# Railway IaC

This project uses Railway Infrastructure as Code through `.railway/railway.ts`.

Use the Railway CLI from the repository root:

```sh
railway login
railway link
pnpm railway:plan
pnpm railway:apply
```

The npm scripts set `NODE_OPTIONS=--experimental-strip-types` because the current Railway CLI imports `.railway/railway.ts` directly.

The config declares:

- `Postgres`: Railway Postgres database.
- `server-core`: Bun + Effect API service.
- `DATABASE_URL`: wired from `Postgres.env.DATABASE_URL`.
- `NODE_ENV`: `production` in the Railway production environment, otherwise `development`.

Railway provides `PORT`; `apps/server-core` reads it at runtime.

Important: do not add `railway.json` or `railway.toml` for `server-core` while using this IaC file. Railway blocks plans when the same service is managed by both Config as Code and Infrastructure as Code.
