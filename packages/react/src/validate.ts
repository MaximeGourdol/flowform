import type { ErrorMap, FormCore } from '@flowform/core';

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

const hasErrors = (errors: ErrorMap): boolean =>
  Object.values(errors).some((messages) => messages.length > 0);

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

export const runAllValidators = async <TValues>(
  form: FormCore<TValues>,
  stepIds: readonly string[],
): Promise<ErrorMap> => {
  const values = form.store.getState().values;
  const merged: Record<string, readonly string[]> = {};
  for (const stepId of stepIds) {
    const step = form.steps.steps.find((candidate) => candidate.id === stepId);
    if (step?.validate === undefined) {
      continue;
    }
    const result = await step.validate(values, {
      currentStepId: stepId,
      trigger: 'submit',
    });
    for (const [key, messages] of Object.entries(result)) {
      if (messages.length > 0) {
        merged[key] = messages;
      }
    }
  }
  return merged;
};

export const errorMapHasErrors = hasErrors;
