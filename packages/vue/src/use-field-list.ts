import type { Path, PathValue } from '@flowform/core';
import { computed, type ComputedRef } from 'vue';
import { useFlowFormContext } from './context.js';

export type ItemOf<TValues, P extends Path<TValues>> =
  PathValue<TValues, P & string> extends readonly (infer U)[] ? U : unknown;

export interface FieldListApi<TItem> {
  readonly items: ComputedRef<readonly TItem[]>;
  readonly append: (value: TItem) => void;
  readonly prepend: (value: TItem) => void;
  readonly insertAt: (index: number, value: TItem) => void;
  readonly removeAt: (index: number) => void;
  readonly moveItem: (from: number, to: number) => void;
  readonly swapItems: (a: number, b: number) => void;
}

export const useFieldList = <TValues, P extends Path<TValues>>(
  path: P,
): FieldListApi<ItemOf<TValues, P>> => {
  type TItem = ItemOf<TValues, P>;
  const ctx = useFlowFormContext<TValues>();

  const items = computed<readonly TItem[]>(() => {
    void ctx.state.value;
    const value: unknown = ctx.core.store.getValue(path);
    return Array.isArray(value) ? (value as readonly TItem[]) : [];
  });

  const run = (mutate: () => void): void => {
    mutate();
    ctx.refresh();
  };

  return {
    items,
    append: (value) => {
      run(() => {
        ctx.core.store.arrayAppend(path, value);
      });
    },
    prepend: (value) => {
      run(() => {
        ctx.core.store.arrayPrepend(path, value);
      });
    },
    insertAt: (index, value) => {
      run(() => {
        ctx.core.store.arrayInsert(path, index, value);
      });
    },
    removeAt: (index) => {
      run(() => {
        ctx.core.store.arrayRemove(path, index);
      });
    },
    moveItem: (from, to) => {
      run(() => {
        ctx.core.store.arrayMove(path, from, to);
      });
    },
    swapItems: (a, b) => {
      run(() => {
        ctx.core.store.arraySwap(path, a, b);
      });
    },
  };
};
