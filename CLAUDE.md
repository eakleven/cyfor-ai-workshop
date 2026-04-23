# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

npm-workspaces monorepo for a Cyfor workshop. Two deployable projects plus a standalone slide deck:

- `api/` — Hono + `@hono/zod-openapi` REST API, Prisma ORM, SQLite datastore at `api/data/workshop.db`.
- `web/` — Vite + React 19 SPA, TailwindCSS v4, TanStack Query, Axios. Consumes the API through an Orval-generated React Query client.
- `slides/` — Standalone Reveal.js deck (not part of the npm workspaces).
- `workshop-tasks/` — Markdown task briefs (`task-1.md`..`task-4.md`) that drive the workshop exercises; `task-1.md` is authoritative for any "create GitHub issues / AGENTS.md" flow.

## Commands

Run from repo root unless noted.

| Command | Description |
| --- | --- |
| `npm install` | Install deps for the root + both workspaces. |
| `npm run dev` | Run API (:3000) and web (:5173) together. Web waits on `GET /health` before Vite starts. |
| `npm run dev:api` | API only. Override port with `API_PORT=4000 npm run dev:api`. |
| `npm run dev:web` | Vite only. Assumes API is already running. |
| `npm run build` | Build both workspaces. |
| `npm run typecheck` | Typecheck both workspaces. |
| `npm run generate` | Regenerate Prisma client, export `api/openapi.json`, run Orval. |

Workspace-specific: `npm run <script> --workspace api` or `--workspace web`.

Slides: `cd slides && npx serve . -l 3030`.

There is no test runner wired up — treat `npm run typecheck` (and a successful `npm run build`) as the verification bar.

## Code generation pipeline

The API → web contract is fully code-generated. Any change to Zod schemas or routes in `api/src/app.ts` must flow through:

1. API dev/build runs `scripts/export-openapi.ts`, which imports the Hono app and writes `api/openapi.json`.
2. Web's `generate` script (Orval, config in `web/orval.config.ts`) consumes `../api/openapi.json` and writes `web/src/api/generated/hooks.ts` (React Query hooks using Axios).
3. `web/src/api/client.ts` provides the `customClient` mutator Orval wires into every generated hook; `web/src/api/index.ts` re-exports both.

After editing API routes or schemas: run `npm run generate` at the repo root (or `npm run generate --workspace api && npm run generate --workspace web`) so the web hooks stay in sync. `npm run build`/`typecheck` in `web` also regenerate, so a stale client typically surfaces as a type error.

## API wiring notes

- Entry: `api/src/index.ts` (Node server) → `api/src/app.ts` (routes) → `api/src/db.ts` (singleton `PrismaClient`, reused via `globalThis` outside production to survive tsx watch reloads).
- Routes are defined with `createRoute` + `app.openapi(...)` so Zod schemas double as runtime validation and OpenAPI source of truth. `app.doc('/openapi.json', ...)` serves the live spec; the same `openApiDocumentConfig` is reused by the export script.
- CORS: defaults allow `http://localhost:4173` and `http://localhost:5173`. Override with a comma-separated `CORS_ORIGIN` env var when the frontend is hosted elsewhere.
- Dev startup runs `prisma generate` then `prisma db push --skip-generate` — **deleting `api/data/workshop.db` and restarting is the intended "reset state" flow**. Migrations exist in `api/prisma/migrations/` but `db push` is what runs on dev/start, so schema changes take effect without creating a migration.

## Web wiring notes

- Entry: `web/src/main.tsx` wraps `<App />` in `QueryClientProvider` and calls `setApiClientBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "/api")`.
- Dev: Vite proxies `/api/*` → `http://localhost:3000` (override target with `VITE_API_PROXY_TARGET`), stripping the `/api` prefix. That's why API routes are defined without an `/api` prefix but called as `/api/...` from the browser.
- Prod/separately-hosted builds: set `VITE_API_BASE_URL` to the absolute API origin at build time.
- TailwindCSS v4 is loaded via the `@tailwindcss/vite` plugin — no `tailwind.config.js`; styling config lives in `web/src/index.css`.
- Never hand-edit `web/src/api/generated/**` — it's overwritten on every `generate` (Orval has `clean: true`).
