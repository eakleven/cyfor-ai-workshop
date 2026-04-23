# Resource Management Feature — Design Spec

**Date:** 2026-04-23
**Source:** `workshop-tasks/task-1.md` — Part 3
**GitHub issue:** #3

## Goal

Evolve the current "items" list into the beginning of a booking/resource management product by adding description and type fields, enabling in-place editing via a modal, and updating all UI copy to say "resources".

## Data model

Changes to `api/prisma/schema.prisma`:

```prisma
model Item {
  id          Int      @id @default(autoincrement())
  title       String
  description String   @default("")
  type        String   @default("Other")
  createdAt   DateTime @default(now())
}
```

- `description`: optional free text, max 500 chars, defaults to empty string.
- `type`: one of `Room | Equipment | Vehicle | Other`, stored as a plain string, defaults to `"Other"`.

Schema is synced via `prisma db push` on startup — no migration file needed for dev.

## API

All changes in `api/src/app.ts`.

**Updated schemas:**
- `ItemSchema` gains `description` (string) and `type` (string) fields.
- `CreateItemSchema` gains optional `description` (default `""`) and required `type` (enum validated with `z.enum`).
- New `UpdateItemSchema`: all fields optional (`title`, `description`, `type`), at least one must be present (`.refine`).
- New `UpdateItemParamsSchema`: same as existing `ItemParamsSchema`.

**New route:** `PATCH /items/{id}`
- Validates params with `UpdateItemParamsSchema`, body with `UpdateItemSchema`.
- Calls `prisma.item.update(...)`.
- Returns updated `ItemSchema` with 200.
- Returns 404 if the item doesn't exist (Prisma `P2025` error).

`toItemResponse` is extended to include `description` and `type`.

After changes: run `npm run generate --workspace api` to export the updated `openapi.json`.

## Generated client

Run `npm run generate --workspace web` (Orval) to regenerate `web/src/api/generated/hooks.ts`. This adds `usePatchItemsId` and updates existing hook types to include the new fields.

## Frontend

**List view (`web/src/App.tsx`):**
- All "item/items" copy → "resource/resources" (heading, placeholder, button labels, empty state).
- Each row shows: title, type badge (small pill), description (one line, truncated with `truncate`), Remove button, Edit button.

**Edit modal:**
- Triggered by the Edit button on each row.
- State: `editingResource: Item | null` — `null` means closed.
- Form fields: Title (text input, required, max 120), Description (textarea, optional, max 500), Type (select: Room / Equipment / Vehicle / Other).
- On submit: calls `usePatchItemsId`, on success invalidates the items query and closes the modal.
- Modal rendered via a fixed overlay (`position: fixed, inset: 0`) with a centered white card, same Tailwind style as the existing form.

**No routing changes** — everything stays in `App.tsx` (single-file frontend matches existing codebase style).

## Validation alignment

| Field | API (Zod) | Frontend |
|---|---|---|
| title | `min(1).max(120)` | `required`, `maxLength=120` |
| description | `max(500)` | `maxLength=500` |
| type | `z.enum([...])` | `<select>` with fixed options |

## Out of scope

- Pagination or filtering (Task 2)
- Booking/reservation logic (Task 3+)
- Separate resource detail page
- Image upload
