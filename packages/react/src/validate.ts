import type { ErrorMap, FormCore } from '@formjourney/core';

interface ConditionalApi {
  readonly activeStepIds: () => readonly string[];
}

interface StepsLike {
  readonly steps: { readonly steps: readonly { readonly id: string }[] };
  readonly conditionalSteps?: unknown;
}

export const readActiveSteps = (form: StepsLike): readonly string[] => {
  const candidate = form.conditionalSteps;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as ConditionalApi).activeStepIds === 'function'
  ) {
    return (candidate as ConditionalApi).activeStepIds();
  }
  return form.steps.steps.map((step) => step.id);
};

export const runStepValidator = async <TValues>(
  form: FormCore<TValues>,
  stepId: string | null,
): Promise<ErrorMap> => {
  if (stepId === null) {
    return {};
  }
  const step = form.steps.steps.find((candidate) => candidate.id === stepId);
  if (step?.validate === undefined) {
    return {};
  }
  return step.validate(form.store.getState().values, {
    currentStepId: stepId,
    trigger: 'step',
  });
};
