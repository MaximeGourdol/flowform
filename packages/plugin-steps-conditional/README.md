# @formjourney/plugin-steps-conditional

A [`@formjourney/core`](../core) plugin that shows or hides steps based on field
values. When a step becomes inactive, its fields are cleared automatically, and
navigation and submit skip it.

## Install

```bash
pnpm add @formjourney/plugin-steps-conditional @formjourney/core
```

## Usage

```ts
import { createForm } from '@formjourney/core';
import { stepsConditionalPlugin } from '@formjourney/plugin-steps-conditional';

const form = createForm({
  initialValues: {
    needsShipping: false,
    shipping: { address: '', zip: '' },
  },
  steps: [{ id: 'profile' }, { id: 'shipping' }, { id: 'review' }],
}).use(
  stepsConditionalPlugin({
    rules: [
      {
        stepId: 'shipping',
        when: { field: 'needsShipping', filled: true },
        clears: [
          { path: 'shipping.address', resetTo: '' },
          { path: 'shipping.zip', resetTo: '' },
        ],
      },
    ],
  }),
);
```

While `needsShipping` is empty, the `shipping` step is inactive:
`form.conditionalSteps.activeStepIds()` returns `['profile', 'review']`, and
`goNextActive` / `submit` skip it. Set `needsShipping` and the step reappears;
clear it again and the two shipping fields reset.

## Conditions

```ts
{ field: 'needsShipping', filled: true }   // truthy / non-empty
{ field: 'plan', equals: 'pro' }           // strict equality (arrays match by includes)
```

## API on the form

```ts
form.conditionalSteps.activeStepIds(); // ids of currently active steps
form.conditionalSteps.isActive('shipping'); // boolean
form.conditionalSteps.sync(); // force a re-evaluation
```

The plugin also feeds the core's active-step resolver, so
`form.steps.activeStepIds()`, `goNextActive`, `goPrevActive`, and
`form.submit()` all respect the rules without extra wiring.

## License

MIT
