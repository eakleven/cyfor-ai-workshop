# Skill vs. Free-form: Test Writing Comparison

## Free-form prompt

> "Write tests for the items API in this project"

**What a model typically produces without a skill:**
- Installs Jest (not Vitest, wrong for ESM)
- Creates a test server that tries to bind to a port
- Imports Prisma directly, fails without a real database
- Tests often use `supertest` (needs HTTP server) rather than `app.request()`
- No guidance on what *behaviors* to cover — usually just tests the happy path
- Mocking is done ad-hoc and inconsistently (some tests mock, some don't)
- Result: tests that fail on first run or never run in CI without a live DB

## Skill-guided prompt

> "Use the write-tests skill to add tests for the items API"

**What the skill enforces:**
- Vitest (correct for this ESM project)
- `app.request()` — Hono's built-in test helper, no server needed
- Prisma mocked at module level via `vi.mock('../db.js')`
- Explicit checklist of behaviors to cover: happy path, query params, validation errors, not-found
- `beforeEach(() => vi.clearAllMocks())` to prevent state leakage between tests
- One `describe` per route, one `it` per behaviour

**Result:** 13 passing tests in `api/src/__tests__/items.test.ts`, covering search/type filter passthrough to Prisma, validation rejections, and the 404 branch — all without a database.

## Key difference

The skill carries project-specific knowledge (Vitest not Jest, `app.request()` not supertest, Prisma mock pattern) that a generic prompt cannot infer. It also defines *what* to test, not just *how to set up* the framework.
