# docs/ — entity pipeline

Each feature is an **entity** that flows through a fixed, test-driven pipeline:

> **product → architect → tester → dev → qa**

| Stage | Owner skill | Does |
|-------|-------------|------|
| product | `/product <idea>` | Turns a freeform idea into a testable `prd.md` (names the entity, searches for duplicates) |
| architect | `/architect <entity>` | Reads `prd.md`, writes `spec.md`, creates the `entity/<entity>` worktree |
| tester | `/tester <entity>` | Writes failing `*.test.ts` from the spec's Test plan (TDD) |
| dev | `/dev <entity>` | Implements `src/<entity>/` until the tests pass |
| qa | `/qa <entity>` | Verifies the suite is green, merges the worktree into `main`, cleans up |

## Layout

```
docs/
  README.md          # this file
  INDEX.md           # registry of every entity + its current stage
  <entity>/
    prd.md           # INPUT  — product requirements (humans or /product own this)
    spec.md          # OUTPUT — technical spec (architect owns this)
    tests/           # test plan / fixtures the tester elaborates
    handoff/         # OPTIONAL input — frontend/design instructions dev implements & qa verifies
src/
  <entity>/          # implementation + colocated *.test.ts (Vitest)
```

## Conventions

- **Stack:** TypeScript, tested with **Vitest** (`npx vitest run`).
- **TDD:** the spec's *Test plan* defines acceptance criteria → tester writes failing tests → dev makes them pass → qa merges.
- **Isolation:** all work for an entity happens in a git worktree at `.worktrees/<entity>` on branch `entity/<entity>` (off `main`). `prd.md` is the only thing edited directly on `main`; everything else lands via the QA merge.
- **PRD changes:** re-run `/architect <entity>` — it diffs `prd.md` since `spec.md`'s `prd_synced` commit and patches the spec incrementally.
