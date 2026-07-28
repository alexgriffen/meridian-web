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

## Tests

Functional browser tests (Playwright, Chromium) cover every screen: tab
navigation, tenant scoping, customer search, subscription create / plan switch,
the invoice list + detail drawer, usage submission, and rollups — plus their
loading, empty, and API-error states.

Each test intercepts `/api/*` in the browser and answers from an in-memory
fixture backend, so the suite needs **no Postgres and no api-gateway** and
asserts the request contract (method, path, query, body, `X-Tenant-Id`) as well
as what the UI renders. Playwright starts the Vite dev server itself.

```bash
pnpm install
pnpm --filter @meridian/web test:e2e:install   # one-time: download Chromium
pnpm --filter @meridian/web test:e2e
pnpm --filter @meridian/web test:e2e:ui        # interactive
```

Point the suite at an already-running console with
`WEB_BASE_URL=http://localhost:5173 pnpm --filter @meridian/web test:e2e`
(API calls are still stubbed in the browser).

In CI the suite runs from the umbrella repo's `web-e2e` job. Failures show up as
inline annotations on the run, a pass/fail table is written to the run summary by
`tests/junit-summary.mjs`, and the HTML report plus the JUnit XML are uploaded as
the `playwright-report` artifact.

## Layout

- `src/` — React app (`App.tsx`, `components/`, `api.ts` fetch client)
- `server.mjs` — production static server + `/api` reverse proxy
- `vite.config.ts` — dev server + proxy
- `playwright.config.ts` — functional test runner config (boots Vite)
- `tests/e2e/` — Playwright specs; `tests/e2e/fixtures/` holds the mock API
  (`mock-api.ts`), seed data (`data.ts`), and shared page objects (`test.ts`)
