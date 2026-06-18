# meridian-web

> Part of the [Meridian](https://github.com/alexgriffen/meridian) billing & revenue platform — split out as its own repository.

The Meridian **billing console** — a Vite + React + TypeScript single-page app for browsing customers, subscriptions, and invoices, posting usage events, and watching invoices land in real time.

**Type:** service · **Owner:** @platform-api

## Talks to

The browser is served from a single origin; `server.mjs` (and Vite's dev proxy)
forward `/api/*` to the public REST API, so there is no CORS and the tenant
header stays under the app's control.

- [`meridian-api-gateway`](https://github.com/alexgriffen/meridian-api-gateway) — every `/api/v1/*` call (customers, subscriptions, invoices, usage)

## Run it

Via the umbrella (recommended — brings up Postgres + every service):

```bash
git clone --recurse-submodules https://github.com/alexgriffen/meridian
cd meridian && docker compose up --build
# open http://localhost:5173
```

Standalone dev server (needs an api-gateway reachable at $API_PROXY_TARGET,
default http://localhost:4000):

```bash
pnpm install
pnpm --filter @meridian/web dev      # http://localhost:5173
```

## Layout

- `src/` — React app (`App.tsx`, `components/`, `api.ts` fetch client)
- `server.mjs` — production static server + `/api` reverse proxy
- `vite.config.ts` — dev server + proxy
