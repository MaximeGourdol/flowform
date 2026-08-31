# @formjourney/react

React bindings for [`@formjourney/core`](../core). A provider puts a form on the
context; hooks read and write it with the right re-renders, and no manual store
subscriptions.

## Install

```bash
pnpm add @formjourney/react @formjourney/core react
```

## Setup

Create the form once, wrap your tree in `FormProvider`, and build typed hooks
for your values type.

```tsx
import { createForm } from '@formjourney/core';
import { createFormHooks, FormProvider } from '@formjourney/react';
import { useMemo } from 'react';

interface Values {
  email: string;
  tags: { label: string }[];
}

const { useField, useStep, useForm, useFieldList } = createFormHooks<Values>();

const App = () => {
  const form = useMemo(
    () =>
      createForm<Values>({
        initialValues: { email: '', tags: [] },
        steps: [{ id: 'main' }],
      }),
    [],
  );
  return (
    <FormProvider form={form} mode="onSubmit" reValidateMode="onChange">
      <Fields />
    </FormProvider>
  );
};
```

`createFormHooks<Values>()` closes over your type so every hook autocompletes
paths and infers value types — you never pass the generic again.

## `useField`

Binds one field. `register()` spreads onto an `<input>`; it writes on change and
marks the field touched on blur.

```tsx
const { value, error, touched, register, setValue } = useField('email');

<input {...register()} />;
<input type="checkbox" {...register({ type: 'checkbox' })} />;
{
  error && <span>{error}</span>;
}
```

## `useStep`

Navigation and per-step validation. `next()` validates the current step and
advances only if it passes; errors are written to the store so fields can show
them. Conditional (hidden) steps are respected automatically.

```tsx
const { currentStep, activeSteps, index, isFirst, isLast, next, prev, goTo } =
  useStep();
```

## `useForm`

Whole-form state and submit. Derived flags come straight from the core;
`handleSubmit` runs the core submit lifecycle.

```tsx
const {
  values,
  errors,
  isDirty,
  isValid,
  isSubmitting,
  submitCount,
  reset,
  resetField,
  trigger,
  handleSubmit,
} = useForm();

<form onSubmit={handleSubmit(async (values) => api.save(values))}>...</form>;
```

## `useFieldList`

A dynamic array of fields. Errors follow their element across reorders and
removals.

```tsx
const { items, append, removeAt, moveItem, swapItems } = useFieldList('tags');

{
  items.map((_, i) => <TagInput key={i} index={i} />);
}
<button onClick={() => append({ label: '' })}>Add</button>;
```

## `useObserve`

Reactively read one path, or the whole form with no argument.

```tsx
const email = useObserve('email');
const all = useObserve();
```

## `useControl` / `Control`

For controlled components that take a value, not a DOM event (custom selects,
UI-library inputs). `onChange` receives the value directly.

```tsx
const { value, error, onChange, onBlur } = useControl('email');
<MySelect value={value} onChange={onChange} onBlur={onBlur} />;
```

Or the render-prop form:

```tsx
<Control name="email">
  {(c) => <MySelect value={c.value} onChange={c.onChange} />}
</Control>
```

## Validation modes

`FormProvider` takes `mode` and `reValidateMode`
(`onSubmit` | `onChange` | `onBlur`).

- `mode` — when a field is first validated, before it has an error.
- `reValidateMode` — how a field re-validates once it already shows an error.

`mode="onSubmit"` with `reValidateMode="onChange"` is the common pairing: no
errors while the user first types, but once an error appears it clears itself as
they fix the field.

## Plugin hooks

`useDevtools()` reads a plugin API off the form (defaults to `devtools`) and
throws a clear message when the plugin is not registered.

## License

MIT
