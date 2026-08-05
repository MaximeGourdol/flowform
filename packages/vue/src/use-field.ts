import type { Path, PathValue } from '@flowform/core';
import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { useFlowFormContext } from './context.js';
import { revalidate } from './revalidate.js';

export interface FieldApi<TValue> {
  readonly model: WritableComputedRef<TValue>;
  readonly value: ComputedRef<TValue>;
  readonly error: ComputedRef<string | undefined>;
  readonly errors: ComputedRef<readonly string[]>;
  readonly touched: ComputedRef<boolean>;
  readonly setValue: (value: TValue) => void;
  readonly onBlur: () => void;
}

export const useField = <TValues, P extends Path<TValues>>(
  path: P,
): FieldApi<PathValue<TValues, P & string>> => {
  type TValue = PathValue<TValues, P & string>;
  const ctx = useFlowFormContext<TValues>();

  const write = (value: TValue): void => {
    ctx.core.store.setValue(path, value);
    ctx.core.bus.emit('field:change', { path, value });
    ctx.refresh();
    void revalidate(ctx, path, 'change');
  };

  const model = computed<TValue>({
    get: () => {
      void ctx.state.value;
      return ctx.core.store.getValue(path);
    },
    set: write,
  });

  const value = computed<TValue>(() => {
    void ctx.state.value;
    return ctx.core.store.getValue(path);
  });

  const errors = computed<readonly string[]>(
    () => ctx.state.value.errors[path] ?? [],
  );
  const error = computed(() => errors.value[0]);
  const touched = computed(() => ctx.state.value.touched[path] === true);

  const onBlur = (): void => {
    ctx.core.store.setTouched(path, true);
    ctx.refresh();
    void revalidate(ctx, path, 'blur');
  };

  return { model, value, error, errors, touched, setValue: write, onBlur };
};
