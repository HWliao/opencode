# Task 5: Verification

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Read: `docs/superpowers/specs/2026-07-08-tui-project-management-design.md`
- Read: `docs/superpowers/plans/2026-07-08-tui-project-management/index.md`
- Read: files changed by Tasks 1 through 4
- No planned source edits unless verification exposes a missed requirement from the approved spec

**Interfaces:**
- Consumes: completed outputs from Tasks 1 through 4.
- Produces: final verification evidence for backend API, generated SDK, TUI project switch, project list, add-project behavior, and type checking.

- [ ] **Step 1: Confirm generated files are current**

Run from `packages/client`:

```bash
bun run generate
```

Expected result: command exits `0`. If it changes generated files, keep the generated changes because Task 1 changed public Server `HttpApi`.

- [ ] **Step 2: Run backend focused tests**

Run from `packages/opencode`:

```bash
bun test test/server/httpapi-directory.test.ts
```

Expected result: PASS. This proves directory browsing is side-effect-free and rejects non-directory inputs.

- [ ] **Step 3: Run backend typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected result: PASS.

- [ ] **Step 4: Run client typecheck**

Run from `packages/client`:

```bash
bun typecheck
```

Expected result: PASS.

- [ ] **Step 5: Run TUI focused tests**

Run from `packages/tui`:

```bash
bun test test/context/project-switch.test.tsx test/component/dialog-project-list.test.ts test/component/dialog-project-add.test.ts
```

Expected result: PASS. This covers active directory switching, project display/search helpers, and add-project input semantics.

- [ ] **Step 6: Run TUI typecheck**

Run from `packages/tui`:

```bash
bun typecheck
```

Expected result: PASS.

- [ ] **Step 7: Spec coverage review**

Check the implementation against these required outcomes:

```text
/projects opens project list
project list uses backend /project
project list searches display name and directory
project list shows display name and directory
project list has no deletion action
ctrl+o opens add-project from project list
add-project has no direct command
esc from add-project returns project list
add-project starts at current project parent directory
selector lists direct child directories
search debounce is 10ms
space copies selected directory into input and loads children
enter confirms input value
confirmed project soft re-enters target home
directory browse API does not call InstanceStore.load or Project.fromDirectory
Windows paths are preserved through TUI input and validated by server-side path resolution
```

Expected result: every line is implemented by code or covered by a focused test. If a line is not covered by code or test, add the smallest missing test or implementation change in the task that owns it.

- [ ] **Step 8: Report final state without committing**

Do not commit. Report:

```text
status: implemented or blocked
commit: none (not requested)
tests: exact commands and pass/fail results
changed files: concise file list
concerns: remaining risks or none
```
