# Task 4: Verification

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Verify: `packages/core`
- Verify: `packages/opencode`
- Verify: `packages/tui` only if spinner runtime code changes touch TUI package files.

- [ ] **Step 1: Run core tests**

Run from `packages/core`: `bun test test/installation-version.test.ts`.

Expected: PASS.

- [ ] **Step 2: Run opencode focused tests**

Run from `packages/opencode`: `bun test test/cli/upgrade-check.test.ts test/cli/upgrade-command.test.ts test/server/httpapi-global.test.ts`.

Expected: PASS.

- [ ] **Step 3: Run typechecks**

Run from package directories only:

```powershell
bun typecheck
```

Expected: PASS in each touched package.

- [ ] **Step 4: Summarize verification**

Report exact commands run, pass/fail status, and any unverified manual runtime scenario.
