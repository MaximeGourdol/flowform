import type { ErrorMap, FormCore, Path, PathValue } from '@formjourney/core';
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  FormContext,
  type FieldTrigger,
  type FormContextValue,
  type ReValidationMode,
  type ValidationMode,
} from './context.js';
import { createSyncStore } from './sync-store.js';
import { runStepValidator } from './validate.js';

export interface FormProviderProps<TValues> {
  readonly form: FormCore<TValues>;
  readonly mode?: ValidationMode;
  readonly reValidateMode?: ReValidationMode;
  readonly children: ReactNode;
}

const triggerMatches = (
  mode: ValidationMode | ReValidationMode,
  trigger: FieldTrigger,
): boolean =>
  (mode === 'onChange' && trigger === 'change') ||
  (mode === 'onBlur' && trigger === 'blur');

export const FormProvider = <TValues,>({
  form,
  mode = 'onSubmit',
  reValidateMode = 'onChange',
  children,
}: FormProviderProps<TValues>): ReactNode => {
  const value = useMemo<FormContextValue<TValues>>(() => {
    const sync = createSyncStore(form);

    const setField = <P extends Path<TValues>>(
      path: P,
      next: PathValue<TValues, P & string>,
    ): void => {
      form.store.setValue(path, next);
      form.bus.emit('field:change', { path, value: next });
      sync.notify();
    };

    const touch = (path: Path<TValues>): void => {
      form.store.setTouched(path, true);
      sync.notify();
    };

    const applyFieldResult = (path: string, result: ErrorMap): void => {
      const current = form.store.getState().errors;
      const messages = result[path];
      const next: Record<string, readonly string[]> = {};
      for (const [key, value] of Object.entries(current)) {
        if (key !== path) {
          next[key] = value;
        }
      }
      if (messages !== undefined && messages.length > 0) {
        next[path] = messages;
      }
      form.store.setErrors(next);
      sync.notify();
    };

    const revalidateField = (
      path: Path<TValues>,
      trigger: FieldTrigger,
    ): void => {
      const inError = (form.store.getState().errors[path] ?? []).length > 0;
      const active = inError ? reValidateMode : mode;
      if (!triggerMatches(active, trigger)) {
        return;
      }
      const stepId = form.steps.currentStep();
      const outcome = runStepValidator(form, stepId);
      void outcome.then((result) => {
        applyFieldResult(path, result);
      });
    };

    return {
      form,
      sync,
      mode,
      reValidateMode,
      setField,
      touch,
      revalidateField,
    };
  }, [form, mode, reValidateMode]);

  useEffect(() => value.sync.dispose, [value]);

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};
