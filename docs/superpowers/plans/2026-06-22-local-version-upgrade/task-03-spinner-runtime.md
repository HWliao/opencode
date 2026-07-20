# Task 3: Spinner Runtime

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Inspect: `packages/opencode/src/cli/cmd/run/footer.view.tsx`
- Inspect: `packages/opencode/src/cli/cmd/run/footer.subagent.tsx`
- Inspect: `packages/tui/src/component/spinner.tsx`
- Modify: only the root-cause file if the direct-run error is reproducible in local packaged output.

- [ ] **Step 1: Reproduce the packaged direct-run error**

Run the built Windows binary directly with a cheap command such as `--version` first, then the command path that triggered `unknown component type: spinner` if available.

Expected: capture whether the error occurs on startup, TUI render, or only a specific screen.

- [ ] **Step 2: Locate spinner component registration path**

Check whether the file rendering `<spinner ... />` imports `opentui-spinner/solid` in the packaged bundle path. Existing likely locations are `footer.view.tsx`, `footer.subagent.tsx`, and `packages/tui/src/component/spinner.tsx`.

- [ ] **Step 3: Apply the smallest runtime fix**

If a renderer uses `<spinner>` without importing the custom-element registration in the same bundled path, add the registration import at that rendering boundary. Do not change visual behavior.

- [ ] **Step 4: Re-run the direct-run scenario**

Rebuild with `bun run --cwd packages/opencode build --single` and run the same direct-run command.

Expected after implementation: no `unknown component type: spinner` error.
