# PR Review

If no PR number was provided, ask: "Which PR number should I review?"

Fetch the PR, then work through the checklist. Report findings grouped by section. End with a verdict.

## 1. Fetch

```bash
gh pr view <number> --comments
gh pr diff <number>
```

## 2. Code generation pipeline

This repo uses a code-gen pipeline: `api/src/app.ts` (Zod schemas) → `api/openapi.json` → `web/src/api/generated/hooks.ts` (Orval). Check:

- [ ] `api/src/app.ts` or a Zod schema changed → `api/openapi.json` must be updated
- [ ] `api/openapi.json` changed → `web/src/api/generated/hooks.ts` must be regenerated (`npm run generate`)
- [ ] `web/src/api/generated/**` must not contain hand-edits (Orval has `clean: true`)
- [ ] `api/prisma/schema.prisma` changed → Prisma client must be regenerated (`npx prisma generate`)
- [ ] `npm run typecheck` passes — a stale generated client surfaces as a type error

## 3. Domain correctness

- [ ] Zod schemas match the Resource/Item model: sensible field names (e.g. `name`, `type`, `description`), correct required/optional split
- [ ] Validation is enforced at the API boundary (route input schemas), not only in the frontend
- [ ] No validation gaps: missing-record cases (`404`), bad enum values, empty strings treated as valid

## 4. Code quality

- [ ] Change is small and focused — one concern per PR
- [ ] New routes appear in `api/src/app.ts` with a declared Zod response schema
- [ ] Edge cases handled: resource not found, invalid input
- [ ] No risky assumptions that could silently break in production

## 5. Post comments

After completing the checklist, post findings to the PR:

```bash
# General review comment (works even on your own PR)
gh pr comment <number> --body "<findings>"

# Approve or request changes (only works on others' PRs)
gh pr review <number> --approve --body "<summary>"
gh pr review <number> --request-changes --body "<summary>"
```

Format the comment with a section per checklist area. Mark each ✅ or flag issues inline with `file:line` references. Include the verdict at the bottom.

## 6. Verdict

Approve, request changes, or flag blockers. Reference specific `file:line` for each issue.
Severity guide: missing regeneration or failing typecheck = block; style/naming = comment only.
