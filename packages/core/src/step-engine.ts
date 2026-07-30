import type { EventBus } from './event-bus.js';
import type { Validator } from './types.js';

export interface Step<TValues> {
  readonly id: string;
  readonly validate?: Validator<TValues>;
}

export interface StepEngine<TValues> {
  readonly steps: readonly Step<TValues>[];
  currentStep(): string | null;
  currentIndex(): number;
  goNext(): Promise<boolean>;
  goPrev(): boolean;
  goTo(id: string): boolean;
  canGoNext(): Promise<boolean>;
}

export interface StepEngineOptions<TValues> {
  readonly steps: readonly Step<TValues>[];
  readonly initialStepId?: string;
  readonly getValues: () => TValues;
  readonly bus: EventBus;
}

const hasErrors = (
  errors: Readonly<Record<string, readonly string[]>>,
): boolean => Object.values(errors).some((messages) => messages.length > 0);

export const createStepEngine = <TValues>(
  options: StepEngineOptions<TValues>,
): StepEngine<TValues> => {
  const { steps, getValues, bus } = options;

  const initialIndex =
    options.initialStepId === undefined
      ? 0
      : steps.findIndex((step) => step.id === options.initialStepId);

  let index = steps.length === 0 ? -1 : Math.max(initialIndex, 0);

  const idAt = (target: number): string | null => steps[target]?.id ?? null;

  const currentStep = (): string | null => idAt(index);

  const currentIndex = (): number => index;

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

  const canGoNext = async (): Promise<boolean> => {
    const step = steps[index];
    if (step?.validate === undefined) {
      return true;
    }
    const errors = await step.validate(getValues(), {
      currentStepId: step.id,
      trigger: 'step',
    });
    return !hasErrors(errors);
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

  return {
    steps,
    currentStep,
    currentIndex,
    goNext,
    goPrev,
    goTo,
    canGoNext,
  };
};
