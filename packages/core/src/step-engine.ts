import type { EventBus } from './event-bus.js';
import type { FormStore } from './store.js';
import type { ErrorMap, Path, Validator } from './types.js';

export interface Step<TValues> {
  readonly id: string;
  readonly validate?: Validator<TValues>;
  readonly fields?: readonly Path<TValues>[];
}

export type TriggerTarget<TValues> =
  Path<TValues> | { readonly step: string } | 'current' | 'all';

export interface StepEngine<TValues> {
  readonly steps: readonly Step<TValues>[];
  currentStep(): string | null;
  currentIndex(): number;
  goNext(): Promise<boolean>;
  goPrev(): boolean;
  goTo(id: string): boolean;
  canGoNext(): Promise<boolean>;
  activeStepIds(): readonly string[];
  isStepActive(id: string): boolean;
  activeIndex(): number;
  goNextActive(): Promise<boolean>;
  goPrevActive(): boolean;
  setActiveStepResolver(resolver: (() => readonly string[]) | null): void;
  trigger(target?: TriggerTarget<TValues>): Promise<boolean>;
}

export interface StepEngineOptions<TValues> {
  readonly steps: readonly Step<TValues>[];
  readonly initialStepId?: string;
  readonly getValues: () => TValues;
  readonly store: FormStore<TValues>;
  readonly bus: EventBus;
  readonly getActiveStepIds?: () => readonly string[];
}

const hasErrors = (errors: ErrorMap): boolean =>
  Object.values(errors).some((messages) => messages.length > 0);

const isPathTarget = <TValues>(
  target: TriggerTarget<TValues>,
): target is Path<TValues> =>
  typeof target === 'string' && target !== 'current' && target !== 'all';

export const createStepEngine = <TValues>(
  options: StepEngineOptions<TValues>,
): StepEngine<TValues> => {
  const { steps, getValues, store, bus } = options;

  const initialIndex =
    options.initialStepId === undefined
      ? 0
      : steps.findIndex((step) => step.id === options.initialStepId);

  let index = steps.length === 0 ? -1 : Math.max(initialIndex, 0);

  const idAt = (target: number): string | null => steps[target]?.id ?? null;

  const currentStep = (): string | null => idAt(index);

  const currentIndex = (): number => index;

  const allIds = (): readonly string[] => steps.map((step) => step.id);

  let activeResolver: (() => readonly string[]) | null =
    options.getActiveStepIds ?? null;

  const setActiveStepResolver = (
    resolver: (() => readonly string[]) | null,
  ): void => {
    activeResolver = resolver;
  };

  const activeStepIds = (): readonly string[] => activeResolver?.() ?? allIds();

  const isStepActive = (id: string): boolean => activeStepIds().includes(id);

  const activeIndex = (): number => {
    const id = currentStep();
    return id === null ? -1 : activeStepIds().indexOf(id);
  };

  const move = (target: number): boolean => {
    if (target < 0 || target >= steps.length || target === index) {
      return false;
    }
    const from = idAt(index);
    const to = idAt(target);
    if (to === null) {
      return false;
    }
    index = target;
    bus.emit('step:change', { from, to });
    return true;
  };

  const stepById = (id: string): Step<TValues> | undefined =>
    steps.find((step) => step.id === id);

  const scopeToFields = (
    map: ErrorMap,
    fields: readonly Path<TValues>[] | undefined,
  ): ErrorMap => {
    if (fields === undefined) {
      return map;
    }
    const allowed = new Set(fields as readonly string[]);
    const out: Record<string, readonly string[]> = {};
    for (const [key, messages] of Object.entries(map)) {
      const owned = [...allowed].some(
        (field) => key === field || key.startsWith(`${field}.`),
      );
      if (owned) {
        out[key] = messages;
      }
    }
    return out;
  };

  const validateStep = async (step: Step<TValues>): Promise<ErrorMap> => {
    if (step.validate === undefined) {
      return {};
    }
    const result = await step.validate(getValues(), {
      currentStepId: step.id,
      trigger: 'step',
    });
    return scopeToFields(result, step.fields);
  };

  const canGoNext = async (): Promise<boolean> => {
    const step = steps[index];
    if (step === undefined) {
      return true;
    }
    return !hasErrors(await validateStep(step));
  };

  const goNext = async (): Promise<boolean> => {
    if (index < 0 || index >= steps.length - 1) {
      return false;
    }
    if (!(await canGoNext())) {
      return false;
    }
    return move(index + 1);
  };

  const goPrev = (): boolean => move(index - 1);

  const goTo = (id: string): boolean => {
    const target = steps.findIndex((step) => step.id === id);
    if (target === -1) {
      return false;
    }
    return move(target);
  };

  const goNextActive = async (): Promise<boolean> => {
    const active = activeStepIds();
    const pos = activeIndex();
    if (pos < 0 || pos >= active.length - 1) {
      return false;
    }
    if (!(await canGoNext())) {
      return false;
    }
    const nextId = active[pos + 1];
    return nextId === undefined ? false : goTo(nextId);
  };

  const goPrevActive = (): boolean => {
    const active = activeStepIds();
    const pos = activeIndex();
    if (pos <= 0) {
      return false;
    }
    const prevId = active[pos - 1];
    return prevId === undefined ? false : goTo(prevId);
  };

  const mergeErrors = (maps: readonly ErrorMap[]): ErrorMap => {
    const out: Record<string, readonly string[]> = {};
    for (const map of maps) {
      for (const [key, messages] of Object.entries(map)) {
        if (messages.length > 0) {
          out[key] = messages;
        }
      }
    }
    return out;
  };

  const trigger = async (
    target: TriggerTarget<TValues> = 'current',
  ): Promise<boolean> => {
    bus.emit('validate:start', { trigger: 'step' });
    store.setValidating(true);

    let scoped: ErrorMap;
    let replaceKeys: readonly string[] | null;

    if (target === 'all') {
      const active = activeStepIds();
      const maps = await Promise.all(
        active.map((id) => {
          const step = stepById(id);
          return step === undefined ? Promise.resolve({}) : validateStep(step);
        }),
      );
      scoped = mergeErrors(maps);
      replaceKeys = null;
    } else if (target === 'current' || !isPathTarget(target)) {
      const stepId =
        target === 'current'
          ? currentStep()
          : (target as { step: string }).step;
      const step = stepId === null ? undefined : stepById(stepId);
      scoped = step === undefined ? {} : await validateStep(step);
      replaceKeys = null;
    } else {
      const step = steps[index];
      const full = step === undefined ? {} : await validateStep(step);
      const path = target;
      scoped = mergeErrors([
        Object.fromEntries(
          Object.entries(full).filter(
            ([key]) => key === path || key.startsWith(`${path}.`),
          ),
        ),
      ]);
      replaceKeys = [path];
    }

    if (replaceKeys === null) {
      store.setErrors(scoped);
    } else {
      for (const key of replaceKeys) {
        store.clearErrors(key);
      }
      for (const [key, messages] of Object.entries(scoped)) {
        store.setError(key, messages);
      }
    }

    store.setValidating(false);
    bus.emit('validate:end', { errors: scoped });
    return !hasErrors(scoped);
  };

  return {
    steps,
    currentStep,
    currentIndex,
    goNext,
    goPrev,
    goTo,
    canGoNext,
    activeStepIds,
    isStepActive,
    activeIndex,
    goNextActive,
    goPrevActive,
    setActiveStepResolver,
    trigger,
  };
};
