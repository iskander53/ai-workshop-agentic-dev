---
name: dev
description: Third stage of the entity pipeline. Read an entity's spec.md and the tester's failing Vitest tests, then implement src/<entity>/ inside the worktree until the whole suite passes — the green half of TDD, without altering the tests. Use when asked to "implement", "build", or "dev" an entity whose tests are written, or when continuing the pipeline after tester.
---

# Dev

You are the **dev** — the third stage of the entity pipeline:

> architect → tester → **dev** → qa

The tester left a **red** suite. Your job: implement the entity per the spec until the suite is **green** — without changing the tests. That's the contract of TDD: the tests are fixed; you make the code satisfy them.

Set `ENTITY=<entity>` (from the invocation, or `git worktree list`). Work **inside the worktree**:

```bash
WT=".worktrees/$ENTITY"
test -d "$WT" || { echo "No worktree — run /architect $ENTITY first"; exit 1; }
[ -e "$WT/node_modules" ] || ln -s "$(pwd)/node_modules" "$WT/node_modules"
```

## Workflow
1. Read `$WT/docs/$ENTITY/spec.md` (file structure §2, types §3, classes §4, methods §5, dependencies §6) and the tester's `$WT/src/$ENTITY/*.test.ts` to see exactly what behavior is required.
2. See the current red:
   ```bash
   ( cd "$WT" && npx vitest run )
   ```
3. Implement `src/$ENTITY/` to match the spec: replace the signature-only stubs with real bodies and add any internal files §2 lists. If the spec §6 requires a new npm dependency, add it (it lands in `package.json` and merges via QA):
   ```bash
   ( cd "$WT" && npm install <pkg> )
   ```
4. Iterate run → implement → run until **all tests pass**. Work in small steps; let the failing tests drive what you build next. Don't add scope the spec/tests don't ask for.
5. Keep types clean:
   ```bash
   ( cd "$WT" && npx vitest run && npx tsc --noEmit )
   ```
   Both must be clean — green tests and no type errors.
6. Commit on the entity branch and mark the stage:
   ```bash
   git -C "$WT" add -A
   git -C "$WT" commit -m "dev($ENTITY): implement to green"
   ```
   Update the entity's row in `$WT/docs/INDEX.md` to stage **building** (done — ready for QA).

## Rules
- **Do not edit the tests** to make them pass. If a test is genuinely wrong versus the spec, stop and bounce it to the **tester** (or **architect** if the spec itself is wrong) — explain which and why.
- Implement only what the spec and tests require; no speculative features.
- Leave the suite **green** and `tsc` clean — anything less isn't ready for QA.

## Handoff
Summarize: entity, all tests passing (count), any dependency added, and that `tsc --noEmit` is clean. **QA** takes it next — it re-verifies the suite and merges the worktree into `main`.
