# Resource Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `description` and `type` fields to resources, enable editing via a modal dialog, and rename all "items" UI copy to "resources".

**Architecture:** Full-stack change flowing Prisma schema → Hono API (new PATCH route + updated Zod schemas) → exported `openapi.json` → Orval-generated React Query hooks → updated React frontend. No routing changes; everything stays in `App.tsx`.

**Tech Stack:** Prisma + SQLite, Hono + `@hono/zod-openapi`, Zod, Orval, React 19, TanStack Query, Axios, TailwindCSS v4.

---

## File map

| File | Change |
|---|---|
| `api/prisma/schema.prisma` | Add `description` and `type` fields to `Item` model |
| `api/src/app.ts` | Update Zod schemas + `toItemResponse`; add `PATCH /items/{id}` route |
| `api/openapi.json` | Regenerated — do not edit by hand |
| `web/src/api/generated/hooks.ts` | Regenerated — do not edit by hand |
| `web/src/App.tsx` | Add edit modal, update list row, rename copy |

---

## Task 1: Update Prisma schema

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Replace the Item model**

Open `api/prisma/schema.prisma` and replace the `Item` model with:

```prisma
model Item {
  id          Int      @id @default(autoincrement())
  title       String
  description String   @default("")
  type        String   @default("Other")
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Push schema to the database**

```bash
npx prisma db push --schema api/prisma/schema.prisma --skip-generate
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add api/prisma/schema.prisma
git commit -m "feat: add description and type fields to Item schema"
```

---

## Task 2: Update API schemas and add PATCH route

**Files:**
- Modify: `api/src/app.ts`

- [ ] **Step 1: Update `ItemSchema` to include the new fields**

In `api/src/app.ts`, replace:

```ts
const ItemSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  title: z.string().min(1).max(120).openapi({ example: 'Build a workshop API' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' })
}).openapi('Item')
```

With:

```ts
const RESOURCE_TYPES = ['Room', 'Equipment', 'Vehicle', 'Other'] as const

const ItemSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  title: z.string().min(1).max(120).openapi({ example: 'Meeting Room A' }),
  description: z.string().max(500).openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).openapi({ example: 'Room' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' })
}).openapi('Item')
```

- [ ] **Step 2: Update `CreateItemSchema` to include the new fields**

Replace:

```ts
const CreateItemSchema = z.object({
  title: z.string().trim().min(1).max(120).openapi({ example: 'Build a workshop API' })
}).openapi('CreateItem')
```

With:

```ts
const CreateItemSchema = z.object({
  title: z.string().trim().min(1).max(120).openapi({ example: 'Meeting Room A' }),
  description: z.string().trim().max(500).default('').openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).default('Other').openapi({ example: 'Room' })
}).openapi('CreateItem')
```

- [ ] **Step 3: Add `UpdateItemSchema` after `ItemParamsSchema`**

After the `ItemParamsSchema` block, add:

```ts
const UpdateItemSchema = z.object({
  title: z.string().trim().min(1).max(120).optional().openapi({ example: 'Meeting Room A' }),
  description: z.string().trim().max(500).optional().openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).optional().openapi({ example: 'Room' })
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
).openapi('UpdateItem')
```

- [ ] **Step 4: Update `toItemResponse` to include the new fields**

Replace:

```ts
const toItemResponse = (item: { id: number; title: string; createdAt: Date }) => ({
  id: item.id,
  title: item.title,
  createdAt: item.createdAt.toISOString()
})
```

With:

```ts
const toItemResponse = (item: { id: number; title: string; description: string; type: string; createdAt: Date }) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  type: item.type,
  createdAt: item.createdAt.toISOString()
})
```

- [ ] **Step 5: Update `createItemRoute` handler to pass new fields**

Replace:

```ts
app.openapi(createItemRoute, async (c) => {
  const { title } = c.req.valid('json')
  const item = await prisma.item.create({
    data: {
      title
    }
  })

  return c.json(toItemResponse(item), 201)
})
```

With:

```ts
app.openapi(createItemRoute, async (c) => {
  const { title, description, type } = c.req.valid('json')
  const item = await prisma.item.create({
    data: { title, description, type }
  })

  return c.json(toItemResponse(item), 201)
})
```

- [ ] **Step 6: Add the `updateItemRoute` definition**

After the `deleteItemRoute` definition block (before `const toItemResponse`), add:

```ts
const updateItemRoute = createRoute({
  method: 'patch',
  path: '/items/{id}',
  tags: ['Items'],
  request: {
    params: ItemParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateItemSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Update a persisted resource',
      content: {
        'application/json': {
          schema: ItemSchema
        }
      }
    },
    404: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }).openapi('NotFound')
        }
      }
    }
  }
})
```

- [ ] **Step 7: Add the `updateItemRoute` handler**

After the `deleteItemRoute` handler block, add:

```ts
app.openapi(updateItemRoute, async (c) => {
  const { id } = c.req.valid('param')
  const data = c.req.valid('json')

  try {
    const item = await prisma.item.update({
      where: { id },
      data
    })
    return c.json(toItemResponse(item), 200)
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      return c.json({ message: 'Resource not found' }, 404)
    }
    throw e
  }
})
```

- [ ] **Step 8: Typecheck the API**

```bash
npm run typecheck --workspace api
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add api/src/app.ts
git commit -m "feat: add description/type fields and PATCH /items/:id route"
```

---

## Task 3: Export updated OpenAPI spec and regenerate client

**Files:**
- Modify: `api/openapi.json` (regenerated)
- Modify: `web/src/api/generated/hooks.ts` (regenerated)

- [ ] **Step 1: Export updated OpenAPI spec**

```bash
npm run generate --workspace api
```

Expected: `OpenAPI schema written to .../api/openapi.json`

- [ ] **Step 2: Regenerate the Orval client**

```bash
npm run generate --workspace web
```

Expected: Orval outputs something like `✔ workshop - Generated 1 file`. The file `web/src/api/generated/hooks.ts` now contains `usePatchItemsId` and updated types that include `description` and `type`.

- [ ] **Step 3: Typecheck the web workspace**

```bash
npm run typecheck --workspace web
```

Expected: no errors (the existing `App.tsx` will have type errors because it doesn't pass `description`/`type` to `usePostItems` yet — that's fixed in Task 4).

> Note: if typecheck fails only in `App.tsx` due to missing fields on `createItemMutation.mutate({ data: { title } })`, that is expected and will be fixed in Task 4.

- [ ] **Step 4: Commit**

```bash
git add api/openapi.json web/src/api/generated/hooks.ts
git commit -m "chore: regenerate openapi.json and Orval client"
```

---

## Task 4: Update frontend — create form, list row, edit modal

**Files:**
- Modify: `web/src/App.tsx`

Replace the entire contents of `web/src/App.tsx` with:

- [ ] **Step 1: Rewrite `App.tsx`**

```tsx
import { type FormEvent, useState } from "react";
import {
  getGetItemsQueryKey,
  useDeleteItemsId,
  useGetItems,
  usePatchItemsId,
  usePostItems,
} from "./api";
import { useQueryClient } from "@tanstack/react-query";

type Resource = {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
};

const RESOURCE_TYPES = ["Room", "Equipment", "Vehicle", "Other"] as const;

export default function App() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("Other");
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("Other");

  const queryClient = useQueryClient();
  const refreshResources = () =>
    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });

  const resourcesQuery = useGetItems();
  const createMutation = usePostItems({
    mutation: {
      onSuccess: async () => {
        setTitle("");
        setDescription("");
        setType("Other");
        await refreshResources();
      },
    },
  });
  const deleteMutation = useDeleteItemsId({
    mutation: { onSuccess: refreshResources },
  });
  const updateMutation = usePatchItemsId({
    mutation: {
      onSuccess: async () => {
        setEditingResource(null);
        await refreshResources();
      },
    },
  });

  const trimmedTitle = title.trim();
  const resources = (resourcesQuery.data?.items ?? []) as Resource[];
  const deletingId = deleteMutation.variables?.id;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedTitle || createMutation.isPending) return;
    createMutation.mutate({ data: { title: trimmedTitle, description: description.trim(), type } });
  };

  const handleRemove = (id: number) => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate({ id });
  };

  const openEdit = (resource: Resource) => {
    setEditingResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description);
    setEditType(resource.type);
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingResource || updateMutation.isPending) return;
    updateMutation.mutate({
      id: editingResource.id,
      data: {
        title: editTitle.trim() || undefined,
        description: editDescription.trim(),
        type: editType as typeof RESOURCE_TYPES[number],
      },
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-slate-600">
            Manage bookable resources. Add, edit, or remove entries below.
          </p>
        </header>

        <form
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={handleCreate}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource name"
            maxLength={120}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 resize-none"
          />
          <div className="flex gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!trimmedTitle || createMutation.isPending}
              className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {createMutation.isPending ? "Adding..." : "Add resource"}
            </button>
          </div>
        </form>

        {createMutation.isError && (
          <p className="text-sm text-rose-600">
            Could not add the resource: {createMutation.error.message}
          </p>
        )}
        {deleteMutation.isError && (
          <p className="text-sm text-rose-600">
            Could not remove the resource: {deleteMutation.error.message}
          </p>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">All resources</h2>

          {resourcesQuery.isPending && (
            <p className="mt-3 text-sm text-slate-600">Loading resources...</p>
          )}
          {resourcesQuery.isError && (
            <p className="mt-3 text-sm text-rose-600">
              Could not load resources: {resourcesQuery.error.message}
            </p>
          )}

          {!resourcesQuery.isPending && !resourcesQuery.isError && (
            resources.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-200">
                {resources.map((resource) => (
                  <li key={resource.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{resource.title}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {resource.type}
                        </span>
                      </div>
                      {resource.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(resource)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(resource.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        {deleteMutation.isPending && deletingId === resource.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No resources yet.</p>
            )
          )}
        </section>
      </div>

      {editingResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingResource(null); }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold">Edit resource</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Resource name"
                maxLength={120}
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 resize-none"
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {updateMutation.isError && (
                <p className="text-sm text-rose-600">
                  Could not save: {updateMutation.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck --workspace web
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/App.tsx
git commit -m "feat: resource list with description, type, and edit modal"
```

---

## Task 5: Smoke test end-to-end

- [ ] **Step 1: Start the full dev stack**

```bash
npm run dev
```

Wait until you see both `Server is running on http://localhost:3000` and the Vite dev server URL (`http://localhost:5173`).

- [ ] **Step 2: Verify create**

Open `http://localhost:5173`. Fill in name, description, select a type, click "Add resource". The resource should appear in the list with its type badge and description.

- [ ] **Step 3: Verify edit**

Click "Edit" on a resource. The modal opens pre-filled. Change the title or description and click "Save". The list updates and the modal closes.

- [ ] **Step 4: Verify remove**

Click "Remove" on a resource. It disappears from the list.

- [ ] **Step 5: Verify persistence**

Refresh the browser. All resources, including any edits, should still be there.

- [ ] **Step 6: Final build check**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 7: Close the visual companion server**

```bash
bash /Users/erikandreaskleven/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/scripts/stop-server.sh /Users/erikandreaskleven/Documents/git/Forsvaret/ai-sopra/cyfor-ai-workshop/.superpowers/brainstorm/59479-1776941689
```
