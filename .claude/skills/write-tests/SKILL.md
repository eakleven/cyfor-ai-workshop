# Write Tests

Write focused, runnable tests for changes in this project. Use **Vitest** for both API and web.

## Setup (first time only)

If Vitest is not yet installed, add it:

```bash
# API
npm install --save-dev vitest --workspace api

# Web
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom --workspace web
```

Add to each workspace's `package.json`:
```json
"test": "vitest run"
```

## API tests (`api/src/__tests__/`)

Hono exposes `app.request()` as a built-in test helper — no HTTP server needed.

Prisma must be mocked so tests run without a real database:

```typescript
// api/src/__tests__/items.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../app.js'

vi.mock('../db.js', () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    }
  }
}))

import { prisma } from '../db.js'
const mockPrisma = vi.mocked(prisma)
```

**What to test for each route:**
- [ ] Happy path returns correct shape and status code
- [ ] Query params (`search`, `type`) filter correctly — assert what Prisma was called with
- [ ] Invalid input returns a validation error (4xx), not a 500
- [ ] Not-found cases return 404 with a message
- [ ] Edge cases: empty string, unknown enum value, missing required fields

Test structure — one `describe` per route, one `it` per behaviour:

```typescript
describe('GET /items', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns items from the database', async () => {
    mockPrisma.item.findMany.mockResolvedValue([
      { id: 1, title: 'Room A', description: '', type: 'Room', createdAt: new Date('2024-01-01') }
    ])
    const res = await app.request('/items')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].title).toBe('Room A')
  })

  it('passes search param to Prisma', async () => {
    mockPrisma.item.findMany.mockResolvedValue([])
    await app.request('/items?search=meeting')
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) })
      })
    )
  })
})
```

## Web tests (`web/src/__tests__/`)

Use React Testing Library against a real component tree. Mock only the generated API hooks — never mock internal React state.

```typescript
// web/src/__tests__/App.test.tsx
/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

vi.mock('../api', () => ({
  useGetItems: vi.fn(),
  usePostItems: vi.fn(),
  useDeleteItemsId: vi.fn(),
  usePatchItemsId: vi.fn(),
  CreateItemType: { Room: 'Room', Equipment: 'Equipment', Vehicle: 'Vehicle', Other: 'Other' },
  UpdateItemType: { Room: 'Room', Equipment: 'Equipment', Vehicle: 'Vehicle', Other: 'Other' },
}))
```

**What to test for each component behaviour:**
- [ ] Loading state renders correctly
- [ ] Empty state renders correctly  
- [ ] List of items renders with correct title and type label
- [ ] Form submit calls the mutation with correct data
- [ ] Error state renders the error message
- [ ] Search input debounces before re-querying

## Vitest config

API — add to `api/package.json`:
```json
"vitest": {
  "environment": "node"
}
```

Web — add to `web/vite.config.ts` (or a `vitest.config.ts`):
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.ts'],
}
```

Setup file:
```typescript
// web/src/__tests__/setup.ts
import '@testing-library/jest-dom'
```

## Checklist before committing tests

- [ ] `npm test --workspace api` passes with no skipped tests
- [ ] `npm test --workspace web` passes with no skipped tests
- [ ] Each test has a single, named assertion about one behaviour
- [ ] No test sleeps, polls, or relies on timing
- [ ] Mocks are cleared between tests (`beforeEach(() => vi.clearAllMocks())`)
- [ ] Tests cover the change being made, not unrelated functionality
