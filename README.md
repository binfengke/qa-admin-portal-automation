# QA Admin Portal Automation (API + UI)

[![ci](https://github.com/binfengke/qa-admin-portal-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/binfengke/qa-admin-portal-automation/actions/workflows/ci.yml)

Reference app + automation sample for QA / QA Automation roles.

This repo is intentionally **small but realistic**: an Admin Portal (web + API + DB) with **cookie auth + RBAC** and a Playwright suite that runs **API tests + UI tests** in a single runner.

## What this demonstrates

- End-to-end setup: `docker compose up` → app is usable + tests can run in CI
- API automation: auth, RBAC negative tests, contract-ish assertions (Zod)
- UI automation: stable selectors (`data-testid`), role-based UI visibility checks
- Test ergonomics: tagging (`@smoke`), HTML report, trace/video on failure (CI)

## Tech stack

- **API**: Fastify + Prisma + Postgres
- **Web**: React + Vite (served by Nginx in Docker), `/api` reverse-proxied to API
- **Automation**: Playwright (`@playwright/test`) for **API + UI**

## Quick start (Docker)

```bash
docker compose up -d --build
```

- Web: `http://localhost:8080` (override with `WEB_HOST_PORT`)
- API: `http://localhost:3000` (override with `API_HOST_PORT`)

If you already have ports 3000/8080 in use:

```bash
WEB_HOST_PORT=18080 API_HOST_PORT=13000 docker compose up -d --build
```

Seeded users:

- `admin@example.com` / `admin123`
- `viewer@example.com` / `viewer123`

## Run tests (local)

Prereqs: Node 20+ and `pnpm` (recommended via corepack).

```bash
corepack enable
pnpm install
pnpm docker:up
pnpm -F @qa-sample/e2e exec playwright install chromium
pnpm test:smoke
```

If you changed Docker ports via `WEB_HOST_PORT` / `API_HOST_PORT`, set:

- `WEB_BASE_URL` (default `http://localhost:8080`)
- `API_BASE_URL` (default `http://localhost:3000`)

Example:

```bash
$env:WEB_BASE_URL="http://localhost:18080"
$env:API_BASE_URL="http://localhost:13000"
pnpm test:smoke
```

## Performance testing (JMeter)

This repo includes a basic JMeter test plan for **authenticated API read load**:

- Test plan: `tests/perf/jmeter/admin-portal-api.jmx`
- Output: `tests/perf/results/`

Run:

```bash
pnpm docker:up
pnpm perf:jmeter
```

Tune load (examples):

```bash
pnpm perf:jmeter -- -Jthreads=25 -JrampUp=10 -Jduration=120
pnpm perf:jmeter -- -JthinkMs=100
```

Report:

- HTML: `tests/perf/results/html/index.html`
- Raw: `tests/perf/results/results.jtl`

## Key endpoints (API)

- `POST /auth/login` (sets `access_token` cookie)
- `POST /auth/logout`
- `GET /me`
- `GET /users` (auth required; list/search/paging)
- `POST /users` / `PATCH /users/:id` / `DELETE /users/:id` (admin only)
- `GET /projects`
- `POST /projects` / `PATCH /projects/:id` / `DELETE /projects/:id` (admin only)

## Repo structure

```text
apps/api    # Fastify + Prisma API
apps/web    # React UI
tests/e2e   # Playwright API + UI tests (one runner)
```

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

- Builds and starts services via Docker Compose
- Installs Playwright Chromium
- Runs `pnpm test:smoke`
- Uploads `playwright-report/` and `test-results/` artifacts

## Troubleshooting

- Ports in use: set `WEB_HOST_PORT` / `API_HOST_PORT` before `docker compose up`
- Reset DB: `docker compose down -v` (removes the docker volume)
