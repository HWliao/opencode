# Task 6: final-verify

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Verify: `packages/opencode/src/session/prompt.ts`
- Verify: `packages/app/src/components/prompt-input/submit.ts`
- Verify: `packages/tui/src/component/prompt/index.tsx`
- Verify: `packages/sdk/js/src/**/gen/*.ts`
- Verify: `docs/isusses/shell-mode-loses-variant.md`

- [ ] **Step 1: Run backend focused tests**

Run from `packages/opencode`:

```bash
bun test test/session/schema-decoding.test.ts
bun test test/session/prompt.test.ts -t "across platforms" --timeout 30000
```

Expected result: schema tests pass, and the cross-platform shell variant tests pass on Windows and Unix. The full `prompt.test.ts` suite may still be run for broader signal, but known Windows 3s timeout failures in unrelated loop/cancel tests should be reported separately instead of blocking this shell variant verification.

- [ ] **Step 2: Run web app focused tests**

Run from `packages/app`:

```bash
bun test --preload ./happydom.ts ./src/components/prompt-input/submit.test.ts ./src/pages/session/session-model-helpers.test.ts
```

Expected result: submit tests pass and session model helper tests still pass.

- [ ] **Step 3: Run affected package typechecks**

Run from `packages/opencode`:

```bash
bun typecheck
```

Run from `packages/app`:

```bash
bun typecheck
```

Run from `packages/tui`:

```bash
bun typecheck
```

Expected result: all affected package typechecks pass.

- [ ] **Step 4: Inspect generated SDK diff for shell variant**

Run from repository root:

```bash
git diff -- packages/sdk/js/src/gen packages/sdk/js/src/v2/gen
```

Expected result: generated shell request types and shell method body include `variant`; unrelated generated churn should be reviewed before proceeding.

- [ ] **Step 5: Inspect full worktree diff**

Run from repository root:

```bash
git diff --stat
git diff -- docs/isusses/shell-mode-loses-variant.md docs/superpowers/specs/2026-06-22-shell-mode-variant-fix-design.md docs/superpowers/plans/2026-06-22-shell-mode-variant packages/opencode/src/session/prompt.ts packages/opencode/test/session/schema-decoding.test.ts packages/opencode/test/session/prompt.test.ts packages/app/src/components/prompt-input/submit.ts packages/app/src/components/prompt-input/submit.test.ts packages/tui/src/component/prompt/index.tsx packages/sdk/js/src
```

Expected result: code changes only cover shell variant propagation, backend fallback, generated SDK output, and related docs.

- [ ] **Step 6: Update issue status only after implementation is verified**

If all verification commands pass, update `docs/isusses/shell-mode-loses-variant.md` by adding this line below the title:

```md
**Status:** Resolved
```

Do not mark the issue resolved if any required verification fails or is skipped for a non-platform reason.

- [ ] **Step 7: Report verification evidence**

Return a concise summary with exact commands run and their pass/fail result. Include any platform-specific skips, especially shell tests skipped by `unixNoLLMServer` on Windows.
