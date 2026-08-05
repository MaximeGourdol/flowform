# @flowform/vue

Vue 3 bindings for [`@flowform/core`](../core). A form is created once and
provided down the tree; composables expose it as refs, so fields bind with
`v-model` and everything else is a `computed` ref.

## Install

```bash
pnpm add @flowform/vue @flowform/core vue
```

## Setup

Create and provide the form in a parent component; children consume it through
the composables.

```vue
<script setup lang="ts">
import { provideFlowForm } from '@flowform/vue';
import { createForm } from '@flowform/core';
import Wizard from './Wizard.vue';

interface Values {
  email: string;
  tags: { name: string }[];
}

provideFlowForm<Values>(() =>
  createForm<Values>({
    initialValues: { email: '', tags: [] },
    steps: [{ id: 'account' }, { id: 'review' }],
  }),
);
</script>

<template>
  <Wizard />
</template>
```

`provideFlowForm` takes either `CreateFormOptions` (optionally with `mode` /
`reValidateMode`) or a factory returning a `FormCore` — use the factory when you
add plugins. Provide and consume must live in **different** components: a parent
provides, its descendants inject. That is the Vue equivalent of React's
`FormProvider` wrapping children.

## `useField` — v-model

Returns a writable `model` ref for `v-model`, plus reactive `error` / `touched`.

```vue
<script setup lang="ts">
import { useField } from '@flowform/vue';
const email = useField<Values, 'email'>('email');
</script>

<template>
  <input v-model="email.model.value" @blur="email.onBlur" />
  <span v-if="email.error.value">{{ email.error.value }}</span>
</template>
```

## `useStep`

Navigation and per-step validation, all as computed refs. `next()` validates the
current step and advances only if it passes; conditional (hidden) steps are
respected.

```ts
const step = useStep();
// step.currentStep, step.activeSteps, step.index, step.isFirst, step.isLast
await step.next();
step.prev();
```

## `useForm`

Whole-form state and submit.

```ts
const form = useForm<Values>();
// form.values, form.errors, form.isValid, form.isDirty,
// form.isSubmitting, form.submitCount (all computed refs)

await form.submit(async (values) => api.save(values));
await form.trigger('all');
form.resetField('email');
form.reset();
```

## `useFieldList`

A dynamic array of fields. Errors follow their element across reorders and
removals. Bind each row from a child component so its `useField` sits in that
component's setup.

```ts
const skills = useFieldList<Values, 'tags'>('tags');
skills.append({ name: '' });
skills.removeAt(0);
skills.moveItem(0, 1);
```

## `useObserve`

Reactively read one path, or the whole form with no argument.

```ts
const email = useObserve<Values, 'email'>('email'); // ComputedRef<string>
const all = useObserve<Values>(); // ComputedRef<Values>
```

## Validation modes

`provideFlowForm`'s options take `mode` and `reValidateMode`
(`onSubmit` | `onChange` | `onBlur`), matching the React and Angular bindings.

- `mode` — when a field is first validated, before it has an error.
- `reValidateMode` — how a field re-validates once it already shows an error.

`useField`'s `v-model` write and `onBlur` drive this. The default,
`mode: 'onSubmit'` with `reValidateMode: 'onChange'`, shows no errors while the
user first types, but once an error appears it clears itself as they fix the
field.

## License

MIT
