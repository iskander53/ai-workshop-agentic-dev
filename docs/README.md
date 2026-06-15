# docs/ — entity pipeline

Each feature flows through a fixed, test-driven pipeline:

> **product → architect → tester → dev → qa**

A **feature** is one **or more** entities built **together in a single git worktree** — the worktree (not the entity) is the unit of isolation, TDD, and the atomic QA merge. Most features are a single entity; a feature that spans several (shared types/config, or entities that depend on each other) puts **all** of them in **one** worktree. See **[Features that span multiple entities](#features-that-span-multiple-entities)**.

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
- **Isolation:** all work for a feature happens in one git worktree at `.worktrees/<work>` (off `main`), where `<work>` is the entity name for a single-entity feature (branch `entity/<entity>`) or a feature slug for a multi-entity one (branch `feature/<slug>`). `prd.md` is the only thing edited directly on `main`; everything else lands via the QA merge.
- **PRD changes:** re-run `/architect <entity>` — it diffs `prd.md` since `spec.md`'s `prd_synced` commit and patches the spec incrementally.

## Features that span multiple entities

The worktree holds **one or more** entities. When a feature needs several entities built together — they share files (shared types, `vitest.config.ts`, `package.json`, root `tsconfig.json`, this `INDEX.md`) or one imports another's not-yet-merged code — put **all** of them in **one** worktree. Do **not** open a worktree per entity for co-developed entities: separate branches would each edit the shared files and **collide at the merge**, neither branch could compile against the other's code, and the spec's end-to-end test (which may span the entities) couldn't run.

- **Identifiers** (used by every stage): `WORK` = worktree/branch slug; `ENTITIES` = the entities in it (one or many); `BRANCH` = `entity/$WORK` (single entity) or `feature/$WORK` (multi-entity feature).
- **One worktree:** `.worktrees/$WORK` on `$BRANCH`. The architect creates it once and writes **every** member entity's `spec.md` + `docs/INDEX.md` row in it; tester writes tests for **every** entity (plus the cross-entity end-to-end); dev implements **every** `src/<entity>/` until the whole suite is green; QA merges the **one** branch atomically and marks **all** the member rows merged.
- **Dependencies vs. members:** entities already merged to `main` are dependencies — present in the branch (off main), not co-developed here. Only entities being built together are members.
- **INDEX:** each entity keeps its own row; members of a feature share the same `feature/<slug>` value in the **Branch** column and advance through stages together.
