---
name: dev
description: Third stage of the entity pipeline. Read an entity's spec.md and the tester's failing Vitest tests, then implement src/<entity>/ inside the worktree until the whole suite passes — the green half of TDD, without altering the tests. Use when asked to "implement", "build", or "dev" an entity whose tests are written, or when continuing the pipeline after tester.
---

# Dev

You are the **dev** — the third stage of the entity pipeline:

> architect → tester → **dev** → qa

The tester left a **red** suite. Your job: implement the entity per the spec until the suite is **green** — without changing the tests. That's the contract of TDD: the tests are fixed; you make the code satisfy them.

Set `WORK` (the worktree slug) and `ENTITIES` (the entities it holds — see the architect skill's **Scope**); a single-entity feature has `WORK=<entity>` and one entity. Work **inside the one worktree**:

```bash
WT=".worktrees/$WORK"
test -d "$WT" || { echo "No worktree — run /architect first"; exit 1; }
[ -e "$WT/node_modules" ] || ln -s "$(pwd)/node_modules" "$WT/node_modules"
```

A worktree may hold **several** entities. Implement **every** entity in `$ENTITIES` until the whole suite — each entity's tests **and** the cross-entity end-to-end — is green and `tsc` is clean. They share this one worktree, so cross-entity imports and shared files (types, `vitest.config.ts`, `package.json`, `tsconfig.json`) just work; never spin up a second worktree. Apply the steps below per entity, and match each entity's handoff screenshots.

## Workflow
1. **Read all the inputs — for each entity `E` in `$ENTITIES`.** `$WT/docs/$E/spec.md` (file structure §2, types §3, classes §4, methods §5, dependencies §6) and the tester's tests (`$WT/docs/$E/tests/*.test.ts`) to see exactly what behavior is required. For a multi-entity feature, also read the **cross-entity end-to-end** test so you know how the entities must fit together.
   **Find each entity's handoff folder.** It holds the **frontend/design source of truth** — design **screenshots** plus written UI/layout/styling/interaction instructions. By convention it's `$WT/docs/$E/handoff/` and its name *contains* "handoff", but it may be named something else entirely. Locate it (`tests/` is never it):
   ```bash
   HANDOFF=$(find "$WT/docs/$E" -mindepth 1 -maxdepth 1 -type d ! -name tests -iname '*handoff*' | head -1)
   # fallback: any non-tests subfolder that holds design screenshots
   [ -z "$HANDOFF" ] && HANDOFF=$(find "$WT/docs/$E" -mindepth 2 -maxdepth 2 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) -exec dirname {} \; | sort -u | grep -v '/tests$' | head -1)
   echo "handoff: ${HANDOFF:-<none>}"
   ```
   If you find one, read **every** file in it — the screenshots are the **visual spec** and the notes are binding design instructions you must implement. If an entity has no such folder, it has no frontend handoff — skip the visual steps below for it.
2. See the current red:
   ```bash
   ( cd "$WT" && npx vitest run )
   ```
3. Implement **every** `src/<entity>/` in `$ENTITIES` to match its spec: replace the signature-only stubs with real bodies and add any internal files §2 lists. For a multi-entity feature, build the shared/depended-on entity first so the others compile against it. If a spec §6 requires a new npm dependency, add it (it lands in `package.json` and merges via QA):
   ```bash
   ( cd "$WT" && npm install <pkg> )
   ```
4. Iterate run → implement → run until **all tests pass**. Work in small steps; let the failing tests drive what you build next. Don't add scope the spec/tests don't ask for.
5. Keep types clean:
   ```bash
   ( cd "$WT" && npx vitest run && npx tsc --noEmit )
   ```
   Both must be clean — green tests and no type errors.
6. **Match the handoff screenshots exactly — prove it with Playwright.** For **each** entity that has a handoff, the UI you built **MUST look exactly the same** as its screenshots. Don't judge from the code — render it and compare:
   - Run the feature so it's viewable (the project's dev server, Storybook, or a small harness page).
   - Drive the browser with the **Playwright MCP** (installed globally): `browser_resize` to the handoff's viewport, `browser_navigate` to the feature, `browser_take_screenshot` for each screen/state the handoff shows. Save captures to a scratch `verify/` subfolder — not into the handoff itself.
   - Compare each capture to its handoff screenshot — layout, spacing, colors, typography, every component state. If anything differs, fix the code and re-screenshot. **Iterate until the Playwright captures are visually identical to the handoff screenshots** — close is not done.
7. Commit once on the branch and mark the stage:
   ```bash
   git -C "$WT" add -A
   git -C "$WT" commit -m "dev($WORK): implement to green"
   ```
   Set the row for **every** entity in `$ENTITIES` in `$WT/docs/INDEX.md` to stage **building** (done — ready for QA).

## Rules
- **Do not edit the tests** to make them pass. If a test is genuinely wrong versus the spec, stop and bounce it to the **tester** (or **architect** if the spec itself is wrong) — explain which and why.
- Implement only what the spec and tests require; no speculative features.
- **The feature must look *exactly* like the handoff screenshots** (when a handoff exists) — verified with Playwright captures, not by inspection. Visual parity (layout, spacing, color, typography, states) is part of "done"; any visible mismatch is a bug.
- Leave the suite **green** and `tsc` clean — anything less isn't ready for QA.

## Handoff
Summarize: the worktree (`WORK`) + every entity in it, the whole suite passing (count, including the cross-entity end-to-end), any dependency added, that `tsc --noEmit` is clean, and — for each entity with a handoff — that the Playwright captures match the handoff screenshots (point to them). **QA** takes it next — it re-verifies the suite and merges the worktree into `main`.
