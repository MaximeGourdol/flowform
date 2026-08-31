# FormJourney

[![CI](https://github.com/MaximeGourdol/flowform/actions/workflows/ci.yml/badge.svg)](https://github.com/MaximeGourdol/flowform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/@formjourney/core.svg?logo=typescript&logoColor=white)](https://www.npmjs.com/package/@formjourney/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@formjourney/core.svg)](https://bundlephobia.com/package/@formjourney/core)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-f69220.svg?logo=pnpm&logoColor=white)](https://pnpm.io)

Headless multi-step form management for TypeScript. The engine has no runtime
dependencies and knows nothing about any UI framework; bindings and validation
adapters live in separate packages you add only if you need them.

```ts
import { createForm } from '@formjourney/core';
import { toValidator } from '@formjourney/adapter-core';
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

| Package                                                                      | What it is                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@formjourney/core`](packages/core)                                         | The headless engine: store, step engine, event bus, submit lifecycle, plugin system                                                                        |
| [`@formjourney/react`](packages/react)                                       | React bindings — `FormProvider` plus `useField` / `useStep` / `useForm` / `useFieldList` / `useObserve` / `useControl`                                     |
| [`@formjourney/angular`](packages/angular)                                   | Angular bindings — `provideFormJourney`, a signals-based `FormJourneyService`, and a `[journeyField]` directive                                            |
| [`@formjourney/vue`](packages/vue)                                           | Vue 3 bindings — `provideFormJourney` plus composables (`useField` for `v-model`, `useStep`, `useForm`, `useFieldList`, `useObserve`)                      |
| [`@formjourney/adapter-core`](packages/adapter-core)                         | `toValidator(schema)` — turns a native schema (Zod, Yup, Joi, Ajv, class-validator, or any Standard Schema) into a validator, provider detected at runtime |
| [`@formjourney/plugin-steps-conditional`](packages/plugin-steps-conditional) | Show or hide steps from field values; clears a removed step's fields automatically                                                                         |
| [`@formjourney/plugin-devtools`](packages/plugin-devtools)                   | Collects a versioned event log and state snapshots from the bus                                                                                            |
| [`@formjourney/devtools-ui`](packages/devtools-ui)                           | A Shadow-DOM web component that renders the devtools timeline                                                                                              |

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
