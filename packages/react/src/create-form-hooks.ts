import type { Path, PathValue } from '@flowform/core';
import { useField, type FieldApi } from './use-field.js';
import { useForm, type FormApi } from './use-form.js';
import { useStep, type StepApi } from './use-step.js';

export interface FormHooks<TValues> {
  readonly useField: <P extends Path<TValues>>(
    path: P,
  ) => FieldApi<PathValue<TValues, P & string>>;
  readonly useStep: () => StepApi;
  readonly useForm: () => FormApi<TValues>;
}

export const createFormHooks = <TValues>(): FormHooks<TValues> => ({
  useField: <P extends Path<TValues>>(path: P) => useField<TValues, P>(path),
  useStep: () => useStep(),
  useForm: () => useForm<TValues>(),
});
