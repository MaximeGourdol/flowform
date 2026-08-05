import type { Path, PathValue } from '@flowform/core';
import { computed, type ComputedRef } from 'vue';
import { useFlowFormContext } from './context.js';

export function useObserve<TValues>(): ComputedRef<TValues>;
export function useObserve<TValues, P extends Path<TValues>>(
  path: P,
): ComputedRef<PathValue<TValues, P & string>>;
export function useObserve<TValues>(
  path?: Path<TValues>,
): ComputedRef<unknown> {
  const ctx = useFlowFormContext<TValues>();
  return computed(() => {
    const state = ctx.state.value;
    return path === undefined ? state.values : ctx.core.store.getValue(path);
  });
}
