# Workshop summary

## Workshop arc

Move from **"AI as a coding assistant"** to **"AI as a development system."**

The progression is:

1. Set up shared context
2. Add reusable capabilities
3. Improve problem definition
4. Run a semi-autonomous delivery loop

## Task 1 - Set up the repo and ship the first feature

### Theory

- Good AI work starts with good project scaffolding.
- GitHub should reflect the workshop backlog so progress is visible.
- `AGENTS.md` gives the agent durable repo context.
- First feature work should be small, end-to-end, and reviewable.

### Practical

1. Turn all `workshop-tasks/task-*.md` parts into GitHub issues.
2. Add a workshop milestone, labels, and links back to the source task/part.
3. Create `AGENTS.md` with repo-specific guidance.
4. Ship the first feature: turn generic items into editable resources.
   - add description
   - add resource type/category
   - allow editing after creation
   - update UI language from "items" to "resources"

### What participants learn

- How to convert workshop material into an executable backlog
- How repo instructions improve Copilot output
- How to use AI for a small full-stack change safely
- How to keep diffs small and grounded in the existing codebase

## Task 2 - Skills, MCPs, and review workflows

### Theory

- Raw prompting is useful, but reusable skills create consistency.
- MCPs let the agent use external tools and fresh knowledge.
- The point is not just installing an MCP, but using it for better decisions.
- A review skill can act like a repeatable capability, not just a saved prompt.

### Practical

1. Create a reusable PR review skill in `.agents/skills/review-pr/`.
2. Install and verify Context7.
3. Use Context7 to implement resource search/filtering:
   - add API query params
   - update contract/client
   - add UI filter/search
   - ensure filtering happens through the API
4. Open a PR and review it with the review skill.
5. Optional stretch:
   - create a `DESIGN.md` / design skill and restyle the UI
   - create a test-writing skill

### What participants learn

- How to encode team judgment into a reusable skill
- How MCPs reduce hallucination by using current docs
- How to compare free-form prompting vs reusable capability
- How to make AI review more structured and less generic

## Task 3 - Context engineering and issue refinement

### Theory

- AI implementation quality depends heavily on problem definition quality.
- Vague requirements hide assumptions, business rules, and edge cases.
- Before asking AI to build, you often need AI to help clarify the problem.
- A refinement skill should ask follow-up questions when ambiguity matters.

### Practical

1. Create a reusable refine-issue skill in `.agents/skills/refine-issue/`.
2. Use it on a deliberately vague requirement:
   - evolve the app from a simple list into something that supports scheduling and reservations
3. Use the skill to surface:
   - what a schedule means
   - what can be booked
   - what counts as reserved
   - statuses, conflicts, rules, and assumptions
4. Produce a refined brief with:
   - user story
   - acceptance criteria
   - business rules
   - non-goals
   - follow-up questions

### What participants learn

- Why "better prompt" is often the wrong framing
- How to turn vague issues into implementation-ready briefs
- How business rules emerge through AI + human ideation
- Why strong context matters more as autonomy increases

## Task 4 - The semi-autonomous loop

### Theory

This is the end-state workflow:

**pick issue -> triage & plan -> implement -> open PR -> review PR -> human merges**

AI can drive most of the motion, but humans must own the control points:

- triage
- plan approval
- PR review
- merge

If a PR is too big to review in 10 minutes, the process failed upstream.

The main agent should mostly be an orchestrator of specialized workers.

### Practical

1. Create reusable stage skills such as:
   - `triage-issue`
   - `plan-implementation`
   - `review-pr`
   - optionally `write-pr`
2. Make those skills reusable across many issues, but aware of repo-specific concerns.
3. Use `gh` so the skills can interact with real GitHub issues and PRs.
4. Pick a post-booking issue such as:
   - booking conflict reasons in UI
   - maintenance blocks
   - CSV export
   - audit log on booking creation
   - booking status filters
5. Run one full pass through the loop:
   - pick issue
   - triage
   - plan
   - implement
   - open PR
   - AI review
   - human review
   - fix and merge

### What participants learn

- How to decompose software delivery into AI-assisted stages
- How to make the main agent an orchestrator instead of a monolith
- How skills, sub-agents, and GitHub integration fit together
- Why trust comes from clear checkpoints, not blind autonomy

## One-slide summary

- **Task 1:** create structure
- **Task 2:** create capabilities
- **Task 3:** create understanding
- **Task 4:** create a trustworthy loop

Or, more simply:

- **Task 1:** set up the repo, backlog, and first feature
- **Task 2:** teach Copilot new tricks with skills and MCPs
- **Task 3:** refine vague requirements into real product thinking
- **Task 4:** orchestrate issue-to-PR delivery with human control points
