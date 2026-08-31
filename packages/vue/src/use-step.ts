import { computed, type ComputedRef } from 'vue';
import { useFormJourneyContext } from './context.js';

export interface StepApi {
  readonly currentStep: ComputedRef<string | null>;
  readonly activeSteps: ComputedRef<readonly string[]>;
  readonly index: ComputedRef<number>;
  readonly total: ComputedRef<number>;
  readonly isFirst: ComputedRef<boolean>;
  readonly isLast: ComputedRef<boolean>;
  readonly next: () => Promise<boolean>;
  readonly prev: () => void;
  readonly goTo: (id: string) => boolean;
}

export const useStep = (): StepApi => {
  const ctx = useFormJourneyContext();

  const currentStep = computed(() => {
    void ctx.state.value;
    return ctx.core.steps.currentStep();
  });
  const activeSteps = computed(() => {
    void ctx.state.value;
    return ctx.core.steps.activeStepIds();
  });
  const index = computed(() => {
    const id = currentStep.value;
    return id === null ? -1 : activeSteps.value.indexOf(id);
  });
  const total = computed(() => activeSteps.value.length);

  const next = async (): Promise<boolean> => {
    const ok = await ctx.core.steps.trigger('current');
    ctx.refresh();
    if (!ok) {
      return false;
    }
    const moved = await ctx.core.steps.goNextActive();
    ctx.refresh();
    return moved;
  };

  const prev = (): void => {
    ctx.core.store.clearErrors();
    ctx.core.steps.goPrevActive();
    ctx.refresh();
  };

  const goTo = (id: string): boolean => {
    const moved = ctx.core.steps.goTo(id);
    ctx.refresh();
    return moved;
  };

  return {
    currentStep,
    activeSteps,
    index,
    total,
    isFirst: computed(() => index.value <= 0),
    isLast: computed(() => index.value >= total.value - 1),
    next,
    prev,
    goTo,
  };
};
