import type { ErrorMap, FormState, Path } from '@flowform/core';
import { useCallback, useSyncExternalStore, type FormEvent } from 'react';
import { useFormContext } from './context.js';
import {
  errorMapHasErrors,
  readActiveSteps,
  runAllValidators,
} from './validate.js';

export type SubmitHandler<TValues> = (values: TValues) => void | Promise<void>;

export interface FormApi<TValues> {
  readonly values: TValues;
  readonly errors: ErrorMap;
  readonly touched: Readonly<Record<string, boolean>>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly reset: (partial?: Partial<TValues>) => void;
  readonly setValue: (path: Path<TValues>, value: unknown) => void;
  readonly handleSubmit: (
    onValid: SubmitHandler<TValues>,
  ) => (event?: FormEvent) => Promise<void>;
}

export const useForm = <TValues>(): FormApi<TValues> => {
  const { form, sync, setField } = useFormContext<TValues>();
  const snapshot: FormState<TValues> = useSyncExternalStore(
    sync.subscribe,
    sync.getSnapshot,
  );

  const reset = useCallback(
    (partial?: Partial<TValues>): void => {
      form.store.reset(partial);
      sync.notify();
    },
    [form, sync],
  );

  const setValue = useCallback(
    (path: Path<TValues>, value: unknown): void => {
      setField(path, value as never);
    },
    [setField],
  );

  const handleSubmit = useCallback(
    (onValid: SubmitHandler<TValues>) =>
      async (event?: FormEvent): Promise<void> => {
        event?.preventDefault();
        form.store.setSubmitting(true);
        form.bus.emit('submit:start', {});
        sync.notify();

        const stepIds = readActiveSteps(form);
        const errors = await runAllValidators(form, stepIds);
        form.store.setErrors(errors);
        sync.notify();

        const ok = !errorMapHasErrors(errors);
        if (ok) {
          await onValid(form.store.getState().values);
        }

        form.bus.emit('submit:end', { errors, ok });
        form.store.setSubmitting(false);
        sync.notify();
      },
    [form, sync],
  );

  return {
    values: snapshot.values,
    errors: snapshot.errors,
    touched: snapshot.touched,
    dirty: snapshot.dirty,
    isSubmitting: snapshot.isSubmitting,
    isValidating: snapshot.isValidating,
    reset,
    setValue,
    handleSubmit,
  };
};
