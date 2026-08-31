import type { Path, PathValue } from '@formjourney/core';
import {
  useCallback,
  useSyncExternalStore,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import { useFormContext } from './context.js';

export interface RegisterOptions {
  readonly type?: string;
}

export interface FieldRegistration {
  readonly name: string;
  readonly value: string;
  readonly checked?: boolean;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLInputElement>) => void;
}

export interface FieldApi<TValue> {
  readonly value: TValue;
  readonly error: string | undefined;
  readonly errors: readonly string[];
  readonly touched: boolean;
  readonly setValue: (value: TValue) => void;
  readonly register: (options?: RegisterOptions) => FieldRegistration;
}

export const useField = <TValues, P extends Path<TValues>>(
  path: P,
): FieldApi<PathValue<TValues, P & string>> => {
  type TValue = PathValue<TValues, P & string>;
  const { form, sync, setField, touch, revalidateField } =
    useFormContext<TValues>();

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

  const setValue = useCallback(
    (next: TValue): void => {
      setField(path, next);
    },
    [setField, path],
  );

  const register = useCallback(
    (options?: RegisterOptions): FieldRegistration => {
      const isCheckbox = options?.type === 'checkbox';
      const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const next = (
          isCheckbox ? event.target.checked : event.target.value
        ) as TValue;
        setField(path, next);
        revalidateField(path, 'change');
      };
      const onBlur = (): void => {
        touch(path);
        revalidateField(path, 'blur');
      };
      const base: FieldRegistration = {
        name: path,
        value: isCheckbox ? '' : String(value),
        onChange,
        onBlur,
      };
      return isCheckbox ? { ...base, checked: Boolean(value) } : base;
    },
    [path, value, setField, touch, revalidateField],
  );

  return {
    value,
    error: errors[0],
    errors,
    touched,
    setValue,
    register,
  };
};
