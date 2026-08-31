import type { Path, PathValue } from '@formjourney/core';
import { useCallback, useSyncExternalStore } from 'react';
import { useFormContext } from './context.js';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useObserve<TValues>(): TValues;
export function useObserve<TValues, P extends Path<TValues>>(
  path: P,
): PathValue<TValues, P & string>;
export function useObserve<TValues>(path?: Path<TValues>): unknown {
  const { form, sync } = useFormContext<TValues>();

  const subscribeAll = useCallback(
    (onChange: () => void) => sync.subscribe(onChange),
    [sync],
  );
  const subscribePath = useCallback(
    (onChange: () => void) =>
      path === undefined
        ? sync.subscribe(onChange)
        : form.store.subscribe(path, onChange),
    [form, sync, path],
  );

  const getAll = useCallback(() => sync.getSnapshot().values, [sync]);
  const getPath = useCallback(
    () => (path === undefined ? undefined : form.store.getValue(path)),
    [form, path],
  );

  const all = useSyncExternalStore(subscribeAll, getAll);
  const single = useSyncExternalStore(subscribePath, getPath);

  return path === undefined ? all : single;
}
