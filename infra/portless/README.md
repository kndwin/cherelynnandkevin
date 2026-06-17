# Portless

This repo uses `vercel-labs/portless` for stable local HTTP URLs.

- API: `https://api.cherelynnandkevin.localhost`
- Engage web: `https://engage.cherelynnandkevin.localhost`
- Wedding web: `https://wedding.cherelynnandkevin.localhost`
- Storybook: `https://storybook.cherelynnandkevin.localhost`

Portless is an HTTP/WebSocket reverse proxy. It is not used for Postgres TCP traffic.

Run every dev app through the root command:

```sh
pnpm dev
```

Run without portless:

```sh
pnpm dev:raw
```
