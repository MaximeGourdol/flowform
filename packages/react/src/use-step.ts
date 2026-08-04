import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useFormContext } from './context.js';
import { readActiveSteps } from './validate.js';

export interface StepApi {
  readonly currentStep: string | null;
  readonly activeSteps: readonly string[];
  readonly index: number;
  readonly total: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly next: () => Promise<boolean>;
  readonly prev: () => void;
  readonly goTo: (id: string) => boolean;
}

export const useStep = (): StepApi => {
  const { form, sync } = useFormContext();

  const subscribeStep = useCallback(
    (onChange: () => void) => form.bus.on('step:change', onChange),
    [form],
  );
  const getStep = useCallback(() => form.steps.currentStep(), [form]);
  const currentStep = useSyncExternalStore(subscribeStep, getStep);

  useSyncExternalStore(sync.subscribe, sync.getSnapshot);

  const activeSteps = readActiveSteps(form);

  const index = currentStep === null ? -1 : activeSteps.indexOf(currentStep);
  const total = activeSteps.length;

  const goTo = useCallback(
    (id: string): boolean => form.steps.goTo(id),
    [form],
  );

  const next = useCallback(async (): Promise<boolean> => {
    const ok = await form.steps.trigger('current');
    sync.notify();
    if (!ok) {
      return false;
    }
    const moved = await form.steps.goNextActive();
    sync.notify();
    return moved;
  }, [form, sync]);

  const prev = useCallback((): void => {
    form.store.clearErrors();
    form.steps.goPrevActive();
    sync.notify();
  }, [form, sync]);

  useEffect(() => {
    const reconcile = (): void => {
      const active = readActiveSteps(form);
      const current = form.steps.currentStep();
      if (current === null || active.includes(current)) {
        return;
      }
      const indexOf = (id: string): number =>
        form.steps.steps.findIndex((step) => step.id === id);
      const fallback = [...active]
        .reverse()
        .find((id) => indexOf(id) <= indexOf(current));
      if (fallback !== undefined) {
        form.steps.goTo(fallback);
      }
    };
    return form.bus.on('field:change', reconcile);
  }, [form]);

  return {
    currentStep,
    activeSteps,
    index,
    total,
    isFirst: index <= 0,
    isLast: index >= total - 1,
    next,
    prev,
    goTo,
  };
};
