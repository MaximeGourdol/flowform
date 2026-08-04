import type { Path, PathValue } from '@flowform/core';
import { useCallback, useSyncExternalStore } from 'react';
import { useFormContext } from './context.js';

export type ItemOf<TValues, P extends Path<TValues>> =
  PathValue<TValues, P & string> extends readonly (infer U)[] ? U : unknown;

export interface FieldListApi<TItem> {
  readonly items: readonly TItem[];
  readonly append: (value: TItem) => void;
  readonly prepend: (value: TItem) => void;
  readonly insertAt: (index: number, value: TItem) => void;
  readonly removeAt: (index: number) => void;
  readonly moveItem: (from: number, to: number) => void;
  readonly swapItems: (a: number, b: number) => void;
  readonly replaceAll: (values: readonly TItem[]) => void;
}

export const useFieldList = <TValues, P extends Path<TValues>>(
  path: P,
): FieldListApi<ItemOf<TValues, P>> => {
  type TItem = ItemOf<TValues, P>;
  const { form, sync } = useFormContext<TValues>();
  const store = form.store;

  const subscribe = useCallback(
    (onChange: () => void) => store.subscribeAll(onChange),
    [store],
  );
  const getItems = useCallback(
    (): readonly TItem[] => store.getValue(path) as readonly TItem[],
    [store, path],
  );
  const items = useSyncExternalStore(subscribe, getItems);

  const after = useCallback(
    (mutate: () => void): void => {
      mutate();
      sync.notify();
    },
    [sync],
  );

  const append = useCallback(
    (value: TItem): void => {
      after(() => {
        store.arrayAppend(path, value);
      });
    },
    [after, store, path],
  );
  const prepend = useCallback(
    (value: TItem): void => {
      after(() => {
        store.arrayPrepend(path, value);
      });
    },
    [after, store, path],
  );
  const insertAt = useCallback(
    (index: number, value: TItem): void => {
      after(() => {
        store.arrayInsert(path, index, value);
      });
    },
    [after, store, path],
  );
  const removeAt = useCallback(
    (index: number): void => {
      after(() => {
        store.arrayRemove(path, index);
      });
    },
    [after, store, path],
  );
  const moveItem = useCallback(
    (from: number, to: number): void => {
      after(() => {
        store.arrayMove(path, from, to);
      });
    },
    [after, store, path],
  );
  const swapItems = useCallback(
    (a: number, b: number): void => {
      after(() => {
        store.arraySwap(path, a, b);
      });
    },
    [after, store, path],
  );
  const replaceAll = useCallback(
    (values: readonly TItem[]): void => {
      after(() => {
        store.arrayReplace(path, values);
      });
    },
    [after, store, path],
  );

  return {
    items,
    append,
    prepend,
    insertAt,
    removeAt,
    moveItem,
    swapItems,
    replaceAll,
  };
};
