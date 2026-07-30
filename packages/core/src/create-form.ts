import { createEventBus, type EventBus } from './event-bus.js';
import type { FormPluginRegistry, Plugin } from './plugin.js';
import { createStepEngine, type Step, type StepEngine } from './step-engine.js';
import { createStore, type FormStore } from './store.js';

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

export interface CreateFormOptions<TValues> {
  readonly initialValues: TValues;
  readonly steps?: readonly Step<TValues>[];
  readonly initialStepId?: string;
}

type MutableRecord = Record<string, unknown>;

export const createForm = <TValues>(
  options: CreateFormOptions<TValues>,
): FormCore<TValues> => {
  const store = createStore(options.initialValues);
  const bus = createEventBus();
  const steps = createStepEngine<TValues>({
    steps: options.steps ?? [],
    ...(options.initialStepId === undefined
      ? {}
      : { initialStepId: options.initialStepId }),
    getValues: () => store.getState().values,
    bus,
  });

  const installed = new Map<string, Plugin>();

  const use = <TApi>(
    plugin: Plugin<TApi>,
    pluginOptions?: unknown,
  ): FormCore<TValues> => {
    if (installed.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    const api = plugin.install(core, pluginOptions);
    installed.set(plugin.name, plugin);
    (core as unknown as MutableRecord)[plugin.name] = api;
    return core;
  };

  const unuse = (name: string): FormCore<TValues> => {
    const plugin = installed.get(name);
    if (plugin === undefined) {
      return core;
    }
    plugin.uninstall?.(core);
    installed.delete(name);
    Reflect.deleteProperty(core, name);
    return core;
  };

  const core = {
    store,
    bus,
    steps,
    use,
    unuse,
  } as unknown as FormCore<TValues>;

  return core;
};
