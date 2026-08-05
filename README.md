# flowform

Headless multi-step form management for TypeScript. The engine has no runtime
dependencies and knows nothing about any UI framework; bindings and validation
adapters live in separate packages you add only if you need them.

```ts
import { createForm } from '@flowform/core';
import { toValidator } from '@flowform/adapter-core';
import { z } from 'zod';

const form = createForm({
  initialValues: { email: '', password: '' },
  steps: [
    {
      id: 'account',
      validate: toValidator(z.object({ email: z.string().email() })),
    },
    { id: 'done' },
  ],
});

await form.steps.goNext(); // validates the current step, then advances
await form.submit(async (values) => {
  await api.signup(values);
});
```

## Packages

| Package                                                                   | What it is                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@flowform/core`](packages/core)                                         | The headless engine: store, step engine, event bus, submit lifecycle, plugin system                                                                        |
| [`@flowform/react`](packages/react)                                       | React bindings — `FormProvider` plus `useField` / `useStep` / `useForm` / `useFieldList` / `useObserve` / `useControl`                                     |
| [`@flowform/angular`](packages/angular)                                   | Angular bindings — `provideFlowForm`, a signals-based `FlowFormService`, and a `[flowField]` directive                                                     |
| [`@flowform/vue`](packages/vue)                                           | Vue 3 bindings — `provideFlowForm` plus composables (`useField` for `v-model`, `useStep`, `useForm`, `useFieldList`, `useObserve`)                         |
| [`@flowform/adapter-core`](packages/adapter-core)                         | `toValidator(schema)` — turns a native schema (Zod, Yup, Joi, Ajv, class-validator, or any Standard Schema) into a validator, provider detected at runtime |
| [`@flowform/plugin-steps-conditional`](packages/plugin-steps-conditional) | Show or hide steps from field values; clears a removed step's fields automatically                                                                         |
| [`@flowform/plugin-devtools`](packages/plugin-devtools)                   | Collects a versioned event log and state snapshots from the bus                                                                                            |
| [`@flowform/devtools-ui`](packages/devtools-ui)                           | A Shadow-DOM web component that renders the devtools timeline                                                                                              |

Everything is framework-agnostic except the bindings. The same core drives the
React, Angular, and Vue bindings.

## Repository

```text
packages/           the published packages (table above)
.changeset/         versioning + changelogs
.github/workflows/  CI: build, lint, typecheck, test
```

pnpm workspace, one Vitest project per package, tsup for dual ESM+CJS+`.d.ts`
output. Shared strict TypeScript config in `tsconfig.base.json`
(`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).

## Development

```bash
pnpm install
pnpm build      # all packages (tsup) — run before lint/typecheck
pnpm test       # Vitest, all packages
pnpm typecheck
pnpm lint
```

Lint and typecheck resolve cross-package imports through each package's built
`.d.ts`, so `pnpm build` has to run first. `pre-commit` runs lint-staged, then
typecheck and test — a commit is blocked if any fail.

## License

[MIT](./LICENSE)
