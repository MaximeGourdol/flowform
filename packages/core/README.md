# @formjourney/core

The headless engine for multi-step forms. Zero runtime dependencies, strict
TypeScript, no knowledge of any UI framework. A form is a plain object you read,
write, and subscribe to; bindings for React and validation adapters live in
other packages.

## Install

```bash
pnpm add @formjourney/core
```

## Creating a form

```ts
import { createForm } from '@formjourney/core';

const form = createForm({
  initialValues: { email: '', password: '' },
  steps: [{ id: 'account' }, { id: 'review' }],
});
```

`createForm` returns a `FormCore` with three pieces — `store`, `steps`, `bus` —
plus a `submit` method and the plugin methods `use` / `unuse`.

## Store

Values, errors, touched state, and derived flags. Field access is by dot path,
fully typed against your values.

```ts
form.store.getValue('email'); // typed as string
form.store.setValue('email', 'a@b.co');

const off = form.store.subscribe('email', (value) => render(value));
off(); // unsubscribe

form.store.subscribeAll(() => rerender()); // any change to any field

const state = form.store.getState();
// { values, errors, touched, dirty, isSubmitting, isValidating,
//   isDirty, isValid, submitCount, dirtyFields, touchedFields }
```

Errors are keyed by path; an empty message array means valid.

```ts
form.store.setError('email', ['Required']);
form.store.clearErrors('email'); // omit the path to clear everything
form.store.getFieldState('email'); // { error, errors, isDirty, isTouched }
```

Arrays have first-class helpers that keep indexed errors and touched state
aligned with the element they belong to:

```ts
form.store.arrayAppend('tags', { label: '' });
form.store.arrayInsert('tags', 1, { label: '' });
form.store.arrayRemove('tags', 0); // errors on tags.1.* shift down to tags.0.*
form.store.arrayMove('tags', 0, 2);
form.store.arraySwap('tags', 0, 1);
```

`reset(partial?)` deep-merges over the initial values; `resetField(path)`
restores one field.

## Steps

The step engine tracks the current step and validates on the way forward.

```ts
form.steps.currentStep(); // 'account' | null
await form.steps.goNext(); // validates the current step; advances only if valid
form.steps.goPrev();
form.steps.goTo('review');
```

A step may declare a validator and the fields it owns:

```ts
{
  id: 'account',
  validate: (values) => (values.email ? {} : { email: ['Required'] }),
  fields: ['email', 'password'],
}
```

`trigger` runs validation on demand and writes the result into the store
(unlike `goNext`, which discards errors when it decides not to move):

```ts
await form.steps.trigger('current'); // the current step
await form.steps.trigger('email'); // one field
await form.steps.trigger('all'); // every active step
```

`goNext` / `goPrev` walk the raw step list. When steps can be conditionally
hidden, use the active-aware variants, which the conditional-steps plugin feeds:

```ts
form.steps.activeStepIds();
await form.steps.goNextActive();
form.steps.goPrevActive();
```

## Submit

`submit` runs the full lifecycle: it bumps `submitCount`, sets `isSubmitting`,
validates every active step, calls your handler only when everything passes,
and emits `submit:start` / `submit:end`.

```ts
const result = await form.submit(async (values) => {
  await api.signup(values);
});
// result: { ok: boolean; values; errors }
```

## Event bus

A typed pub/sub the engine and plugins publish to.

```ts
const off = form.bus.on('step:change', ({ from, to }) => {});
```

Events: `field:change`, `field:blur`, `step:change`, `validate:start`,
`validate:end`, `submit:start`, `submit:end`.

## Plugins

The core exposes a small plugin contract and nothing about any concrete plugin.

```ts
export interface Plugin<TApi = unknown> {
  readonly name: string;
  readonly install: (core: FormCore<any>, options?: unknown) => TApi;
  readonly uninstall?: (core: FormCore<any>) => void;
}
```

`install` receives the live core, wires itself to the store or bus, and returns
its public API. That API is attached under `core[plugin.name]`:

```ts
form.use(plugin, options); // throws if the name is already registered; chainable
form.unuse('name'); // calls uninstall, removes the key
```

### Typed access via `FormPluginRegistry`

`FormPluginRegistry` is an empty, augmentable interface that `FormCore` extends.
A plugin adds its own key from its own package, so the core stays unaware of
every plugin at compile time and runtime:

```ts
declare module '@formjourney/core' {
  interface FormPluginRegistry {
    analytics: AnalyticsApi;
  }
}
```

Importing the plugin pulls in the augmentation, and `form.analytics` becomes
typed with no change to `@formjourney/core`.

### Writing a plugin

A plugin is a factory returning a `Plugin<TApi>`. It touches the core only
through `store` and `bus`, never another plugin directly.

```ts
import type { Plugin } from '@formjourney/core';

export interface AnalyticsApi {
  track: (event: string) => void;
}

declare module '@formjourney/core' {
  interface FormPluginRegistry {
    analytics: AnalyticsApi;
  }
}

export const analytics = (sink: (e: string) => void): Plugin<AnalyticsApi> => {
  let off: (() => void) | undefined;
  return {
    name: 'analytics',
    install: (core) => {
      off = core.bus.on('step:change', (p) => sink(`step:${p.to}`));
      return { track: sink };
    },
    uninstall: () => off?.(),
  };
};
```

Conventions for plugin packages:

- Augment `FormPluginRegistry` from the plugin package, never from the core.
- Export both the API type (`XxxApi`) and the factory (`xxx()`).
- Registry keys are `camelCase`, matching the property they expose.
- Declare `@formjourney/core` as a `peerDependency`.
- No plugin-to-plugin imports; communicate over the bus.

## License

MIT
