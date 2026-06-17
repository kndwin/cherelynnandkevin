# Cloudflare Pages

The engage frontend is hosted on Cloudflare Pages.

- App: `apps/client-engage-web`
- Package: `@cherelynnandkevin/client-engage-web`
- Pages project: `cherelynnandkevin-client-engage-web`
- Production domain: `engage.cherelynnandkevin.com`

Deploy from the repository root:

```sh
pnpm client:deploy
```

The deploy script sets `CLOUDFLARE_ACCOUNT_ID=d549a47e154c5803519d3c312cfa6d1c` because this Wrangler login has access to multiple Cloudflare accounts.

The deploy script builds with `VITE_API_URL=https://server-core-production-4f99.up.railway.app` so the production frontend calls the public Railway API instead of the Cloudflare Pages origin.

Cloudflare Pages needs the custom domain attached to the Pages project after the first deploy. Wrangler `4.97.0` can create and deploy Pages projects, but it does not expose a custom-domain command. Attach `engage.cherelynnandkevin.com` in the Cloudflare Pages dashboard for `cherelynnandkevin-client-engage-web`.
