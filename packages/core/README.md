# @flowform/core

Headless engine for multi-step forms. Zero runtime dependencies, strict
TypeScript. This document is the **reference for writing plugins** — internal
or third-party — against the core's plugin contract.

## The plugin contract

The core exposes three plugin primitives and nothing about any concrete plugin:

```ts
export interface FormPluginRegistry {}

export interface FormCore<TValues> extends FormPluginRegistry {
  readonly store: FormStore<TValues>;
  readonly bus: EventBus;
  readonly steps: StepEngine<TValues>;
  readonly use: <TApi>(
    plugin: Plugin<TApi>,
    options?: unknown,
  ) => FormCore<TValues>;
  readonly unuse: (name: string) => FormCore<TValues>;
}

export interface Plugin<TApi = unknown> {
  readonly name: string;
  readonly install: (core: FormCore<any>, options?: unknown) => TApi;
  readonly uninstall?: (core: FormCore<any>) => void;
}
```

A plugin is a factory returning a `Plugin<TApi>`. `install` receives the live
core (store, bus, steps), wires itself up, and returns its public API. That API
is attached to the core under `core[plugin.name]`.

## `FormPluginRegistry` — the type extension point

`FormPluginRegistry` is an **empty, augmentable interface**. `FormCore` extends
it, so any key added to the registry becomes a typed property on every form.

The core never adds keys to it. A plugin adds its own key from **its own
package** via `declare module`, so the core stays unaware of every plugin at
both compile time and runtime:

```ts
declare module '@flowform/core' {
  interface FormPluginRegistry {
    analytics: AnalyticsApi;
  }
}
```

Importing the plugin's module pulls in this augmentation, and `form.analytics`
becomes fully typed and auto-completed — with no change to `@flowform/core`.

## Lifecycle

- `form.use(plugin, options?)` — throws if `plugin.name` is already registered,
  calls `install(core, options)`, exposes the returned API under
  `core[plugin.name]`, returns the core (chainable).
- `form.unuse(name)` — calls `uninstall?(core)`, removes the API key, no-op for
  an unknown name.

## Example: a fictional third-party plugin

`@acme/flowform-plugin-analytics` — reports step changes to an analytics sink.
Note it never imports another plugin and only touches the core through the
event bus.

```ts
import type { Plugin } from '@flowform/core';

export interface AnalyticsApi {
  track: (event: string) => void;
  flush: () => Promise<void>;
}

export interface AnalyticsOptions {
  readonly sink: (event: string) => void;
}

declare module '@flowform/core' {
  interface FormPluginRegistry {
    analytics: AnalyticsApi;
  }
}

export const analytics = (options: AnalyticsOptions): Plugin<AnalyticsApi> => ({
  name: 'analytics',
  install: (core) => {
    const queue: string[] = [];
    const track = (event: string): void => {
      queue.push(event);
      options.sink(event);
    };

    const offStep = core.bus.on('step:change', (payload) => {
      track(`step:${payload.to}`);
    });

    return {
      track,
      flush: async () => {
        offStep();
        queue.length = 0;
        await Promise.resolve();
      },
    };
  },
});
```

Usage in a consuming app:

```ts
import { createForm } from '@flowform/core';
import { analytics } from '@acme/flowform-plugin-analytics';

const form = createForm({ initialValues: { email: '' } }).use(
  analytics({ sink: (e) => console.log(e) }),
);

form.analytics.track('opened'); // typed via the registry augmentation
```

## Rules for plugin packages

1. **Never modify `FormPluginRegistry` inside `@flowform/core`.** Augment it via
   `declare module` from the plugin package only.
2. **No `any` in a plugin's public API.** The single tolerated `any` is
   `FormCore<any>` in the `install`/`uninstall` signature (covariance).
3. **Export both the API type (`XxxApi`) and the factory (`xxx()`).**
4. **No plugin-to-plugin imports.** Cross-plugin communication goes through the
   event bus (`core.on('other-plugin:event', …)`) or explicit user-provided
   options.
5. **Registry keys are `camelCase`**, matching the property they expose
   (`form.analytics`, not `form.AnalyticsPlugin`).
6. Declare `@flowform/core` as a **`peerDependency`**, never a direct dependency.
7. Ship a **type test** (`*.test-d.ts`) asserting `form.<key>` is inferred and
   that unknown members are rejected (`@ts-expect-error`).
