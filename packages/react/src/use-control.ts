import type { Path, PathValue } from '@flowform/core';
import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { useFormContext } from './context.js';

export interface ControlApi<TValue> {
  readonly name: string;
  readonly value: TValue;
  readonly error: string | undefined;
  readonly errors: readonly string[];
  readonly touched: boolean;
  readonly onChange: (value: TValue) => void;
  readonly onBlur: () => void;
}

export const useControl = <TValues, P extends Path<TValues>>(
  path: P,
): ControlApi<PathValue<TValues, P & string>> => {
  type TValue = PathValue<TValues, P & string>;
  const { form, sync, setField, touch } = useFormContext<TValues>();

  const subscribeValue = useCallback(
    (onChange: () => void) => form.store.subscribe(path, onChange),
    [form, path],
  );
  const getValue = useCallback(
    (): TValue => form.store.getValue(path),
    [form, path],
  );
  const value = useSyncExternalStore(subscribeValue, getValue);

  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot);
  const errors = snapshot.errors[path] ?? [];
  const touched = snapshot.touched[path] ?? false;

  const onChange = useCallback(
    (next: TValue): void => {
      setField(path, next);
    },
    [setField, path],
  );
  const onBlur = useCallback((): void => {
    touch(path);
  }, [touch, path]);

  return {
    name: path,
    value,
    error: errors[0],
    errors,
    touched,
    onChange,
    onBlur,
  };
};

export interface ControlProps<TValues, P extends Path<TValues>> {
  readonly name: P;
  readonly children: (
    control: ControlApi<PathValue<TValues, P & string>>,
  ) => ReactNode;
}

export const Control = <TValues, P extends Path<TValues>>({
  name,
  children,
}: ControlProps<TValues, P>): ReactNode =>
  children(useControl<TValues, P>(name));
