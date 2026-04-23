---
name: design
description: Apply Forsvaret design system to this application's UI. Use when restyling components, adding new UI, or reviewing whether existing UI follows the visual identity guidelines.
---

# Forsvaret Design Skill

When applying Forsvaret's visual identity to this application, follow these rules precisely. The full rationale is in `DESIGN.md` at the project root.

## Core principle

Every design decision must be **functional, flat, and calm**. Forsvaret's identity guidelines explicitly prohibit drop shadows, gradients, bevels, and diagonal elements.

## Color tokens (defined in `web/src/index.css` `@theme`)

Use these Tailwind utilities — never hardcode hex values in components:

| Utility | Usage |
|---|---|
| `bg-fv-green` / `text-fv-green` | Primary actions, active states |
| `bg-fv-green-mid` / `text-fv-green-mid` | Hover states |
| `bg-fv-sage` / `text-fv-sage` | Badges, type labels |
| `bg-fv-bg` | Page background |
| `bg-fv-card` | Panels, cards |
| `border-fv-border` | All borders |
| `text-fv-text` | Primary body copy |
| `text-fv-text-muted` | Helper text, metadata |
| `text-fv-red` | Error messages only |

## Typography

- Font family: `Arial, sans-serif` — set in `index.css` `@theme`
- Page title: `text-xl font-normal` — avoid heavy weights
- Section heading: `text-sm font-medium`
- Body: `text-sm`
- Labels: `text-xs`

## What to avoid (violations of Forsvaret identity)

- `shadow-*` — remove all drop shadows; use `border border-fv-border` instead
- `rounded-lg`, `rounded-xl` — maximum `rounded` (4px); prefer `rounded-sm` or no rounding
- `bg-gradient-*` — no gradients anywhere
- Bright accent colors (`blue-*`, `indigo-*`, etc.) — use only the `fv-*` palette

## Checklist when restyling a component

1. Replace any `shadow-*` with `border border-fv-border`
2. Replace `bg-slate-900` / `bg-blue-*` with `bg-fv-green`
3. Replace `bg-slate-50` / `bg-gray-*` (page bg) with `bg-fv-bg`
4. Replace `bg-white` (cards) with `bg-fv-card`
5. Replace `border-slate-*` with `border-fv-border`
6. Replace `text-slate-*` (body) with `text-fv-text` or `text-fv-text-muted`
7. Replace `text-rose-*` / `text-red-*` with `text-fv-red`
8. Replace `rounded-lg` / `rounded-xl` with `rounded-sm`
9. Set `font-family: Arial` via the theme token
10. Verify: no gradients, no shadows, no diagonal elements remain

## Example: primary button

```tsx
// Before (generic)
<button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm">

// After (Forsvaret)
<button className="rounded-sm bg-fv-green px-4 py-2 text-sm font-medium text-white hover:bg-fv-green-mid">
```

## Example: card/panel

```tsx
// Before
<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">

// After
<div className="border border-fv-border bg-fv-card p-4">
```
