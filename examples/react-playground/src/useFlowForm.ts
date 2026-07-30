import type { FormCore, FormState, Path, PathValue } from '@flowform/core';
import { useCallback, useSyncExternalStore } from 'react';

export const useField = <TValues, P extends Path<TValues>>(
  form: FormCore<TValues>,
  path: P,
): PathValue<TValues, P & string> => {
  const subscribe = useCallback(
    (onChange: () => void) => form.store.subscribe(path, onChange),
    [form, path],
  );
  const getSnapshot = useCallback(
    () => form.store.getValue(path),
    [form, path],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useCurrentStep = <TValues>(
  form: FormCore<TValues>,
): string | null => {
  const subscribe = useCallback(
    (onChange: () => void) => form.bus.on('step:change', onChange),
    [form],
  );
  const getSnapshot = useCallback(() => form.steps.currentStep(), [form]);
  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useFormState = <TValues>(
  form: FormCore<TValues>,
): FormState<TValues> => form.store.getState();
