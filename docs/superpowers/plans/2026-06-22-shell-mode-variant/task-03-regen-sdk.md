# Task 3: regen-sdk

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/sdk/js/src/gen/sdk.gen.ts`
- Modify: `packages/sdk/js/src/gen/types.gen.ts`
- Modify: `packages/sdk/js/src/v2/gen/sdk.gen.ts`
- Modify: `packages/sdk/js/src/v2/gen/types.gen.ts`

- [ ] **Step 1: Regenerate the JavaScript SDK**

Run from the repository root:

```bash
./packages/sdk/js/script/build.ts
```

Expected result: generated SDK files update to include `variant?: string` for shell request parameters and shell request types.

- [ ] **Step 2: Confirm generated shell method exposes variant**

Inspect generated SDK output for the v2 shell method and ensure the parameter shape includes `variant?: string`:

```ts
public shell<ThrowOnError extends boolean = false>(
  parameters: {
    sessionID: string
    directory?: string
    workspace?: string
    messageID?: string
    agent?: string
    model?: {
      providerID: string
      modelID: string
    }
    variant?: string
    command?: string
  },
  options?: Options<never, ThrowOnError>,
)
```

The generated code does not need to match whitespace exactly, but the `variant` field must be present and must be sent in the request body args.

- [ ] **Step 3: Run SDK package typecheck if available**

Run from `packages/sdk/js`:

```bash
bun typecheck
```

Expected result: SDK package typecheck passes.

- [ ] **Step 4: Do not hand-edit generated output**

If generated SDK files do not include `variant`, return to Task 1 and confirm `ShellInput` is exported through the HTTP API schema. Do not patch generated files manually.
