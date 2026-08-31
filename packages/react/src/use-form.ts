import type {
  ErrorMap,
  FormState,
  Path,
  TriggerTarget,
} from '@formjourney/core';
import { useCallback, useSyncExternalStore, type FormEvent } from 'react';
import { useFormContext } from './context.js';

export type SubmitHandler<TValues> = (values: TValues) => void | Promise<void>;

export interface FormApi<TValues> {
  readonly values: TValues;
  readonly errors: ErrorMap;
  readonly touched: Readonly<Record<string, boolean>>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly dirtyFields: Readonly<Record<string, boolean>>;
  readonly touchedFields: Readonly<Record<string, boolean>>;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly submitCount: number;
  readonly reset: (partial?: Partial<TValues>) => void;
  readonly resetField: (path: Path<TValues>) => void;
  readonly setValue: (path: Path<TValues>, value: unknown) => void;
  readonly trigger: (target?: TriggerTarget<TValues>) => Promise<boolean>;
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

  const resetField = useCallback(
    (path: Path<TValues>): void => {
      form.store.resetField(path);
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

  const trigger = useCallback(
    async (target?: TriggerTarget<TValues>): Promise<boolean> => {
      const ok = await form.steps.trigger(target);
      sync.notify();
      return ok;
    },
    [form, sync],
  );

  const handleSubmit = useCallback(
    (onValid: SubmitHandler<TValues>) =>
      async (event?: FormEvent): Promise<void> => {
        event?.preventDefault();
        await form.submit(onValid);
        sync.notify();
      },
    [form, sync],
  );

  return {
    values: snapshot.values,
    errors: snapshot.errors,
    touched: snapshot.touched,
    dirty: snapshot.dirty,
    dirtyFields: snapshot.dirtyFields,
    touchedFields: snapshot.touchedFields,
    isSubmitting: snapshot.isSubmitting,
    isValidating: snapshot.isValidating,
    isDirty: snapshot.isDirty,
    isValid: snapshot.isValid,
    submitCount: snapshot.submitCount,
    reset,
    resetField,
    setValue,
    trigger,
    handleSubmit,
  };
};
