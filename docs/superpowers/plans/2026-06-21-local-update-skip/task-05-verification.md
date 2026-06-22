# Task 5: Verification

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Test: `packages/core/test/installation-version.test.ts`
- Test: `packages/opencode/test/cli/upgrade-check.test.ts`
- Test: `packages/opencode/test/cli/upgrade-command.test.ts`
- Test: `packages/opencode/test/server/httpapi-global.test.ts`
- Verify: `packages/core/package.json`
- Verify: `packages/opencode/package.json`

- [ ] **Step 1: Run focused core tests**

Run from `packages/core`:

```bash
bun test test/installation-version.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused opencode tests**

Run from `packages/opencode`:

```bash
bun test test/cli/upgrade-check.test.ts test/cli/upgrade-command.test.ts test/server/httpapi-global.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run core typecheck**

Run from `packages/core`:

```bash
bun typecheck
```

Expected: PASS.

- [ ] **Step 4: Run opencode typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected: PASS.

- [ ] **Step 5: Confirm SDK regeneration is not required**

Do not run `./packages/sdk/js/script/build.ts` for this change unless the HTTP API schema changes. This plan keeps `GlobalUpgradeResult` unchanged and only returns the existing `{ success: false, error: string }` branch, so SDK output should not change.

Verify with:

```bash
git diff -- packages/opencode/src/server/routes/instance/httpapi/groups/global.ts packages/sdk/js/src/v2/gen/types.gen.ts packages/sdk/js/src/v2/gen/sdk.gen.ts
```

Expected: no diff in `groups/global.ts` or SDK generated files from this feature.

- [ ] **Step 6: Inspect final working tree diff**

Run from the repository root:

```bash
git status --short
git diff -- packages/core/src/installation/version.ts packages/core/test/installation-version.test.ts packages/opencode/src/installation/index.ts packages/opencode/src/cli/upgrade.ts packages/opencode/test/cli/upgrade-check.test.ts packages/opencode/src/cli/cmd/upgrade.ts packages/opencode/test/cli/upgrade-command.test.ts packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts packages/opencode/test/server/httpapi-global.test.ts packages/tui/src/app.tsx
```

Expected: only the intended implementation and test files are modified.

- [ ] **Step 7: Commit verification fixes if any were needed**

If Step 1 through Step 6 required small fixes after the task commits, commit only those fixes:

```bash
git add packages/core packages/opencode packages/tui
git commit -m "test(opencode): verify local upgrade skip"
```

If no fixes were needed, do not create an empty commit.
