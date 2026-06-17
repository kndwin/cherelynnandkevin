# Railway

Railway is managed with Infrastructure as Code in `.railway/railway.ts`.

Docs: https://docs.railway.com/infrastructure-as-code

From the repository root:

```sh
railway login
railway link
pnpm railway:plan
pnpm railway:apply
```

The npm scripts set `NODE_OPTIONS=--experimental-strip-types` because the current Railway CLI imports `.railway/railway.ts` directly.

The IaC file creates a `Postgres` database and a `server-core` service. The service receives `DATABASE_URL` from `Postgres.env.DATABASE_URL`; Railway provides `PORT` automatically.

This repo intentionally does not use `apps/server-core/railway.json`. Railway IaC and Config as Code cannot manage the same service at the same time.
