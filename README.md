# meridian-web

> Part of the [Meridian](https://github.com/alexgriffen/meridian) billing & revenue platform — split out as its own repository.

The Meridian **billing console** — a Vite + React + TypeScript single-page app for managing billing through the public API.

**Type:** service · **Owner:** @platform-api

## Screens

- **Customers** — search by name/email
- **Subscriptions** — list, create, and switch plans
- **Invoices** — auto-refreshing list; click a row for a **detail drawer** with the subtotal / tax / total breakdown
- **Usage** — post usage events and watch them get accepted
- **Rollups** — daily usage aggregates produced by usage-aggregator, auto-refreshing

## Talks to

The browser is served from a single origin; `server.mjs` (and Vite's dev proxy)
forward `/api/*` to the public REST API, so there is no CORS and the tenant
header stays under the app's control.

- [`meridian-api-gateway`](https://github.com/alexgriffen/meridian-api-gateway) — every `/api/v1/*` call (customers, subscriptions, invoices, usage, usage rollups)

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
