import type { FieldState, FormState } from '@flowform/core';
import { useFormContext } from '@flowform/react';
import { useCallback, useSyncExternalStore } from 'react';
import type { SignupValues } from './form';

const useCtx = () => useFormContext<SignupValues>();

export interface FieldArrayApi<T> {
  readonly items: readonly T[];
  readonly append: (value: T) => void;
  readonly prepend: (value: T) => void;
  readonly remove: (index: number) => void;
  readonly move: (from: number, to: number) => void;
  readonly swap: (a: number, b: number) => void;
}

export const useFieldArray = <T>(path: string): FieldArrayApi<T> => {
  const { form, sync } = useCtx();
  const store = form.store;

  const subscribe = useCallback(
    (cb: () => void) => store.subscribeAll(cb),
    [store],
  );
  const getItems = useCallback(
    () => store.getValue(path as never) as readonly T[],
    [store, path],
  );
  const items = useSyncExternalStore(subscribe, getItems);

  const append = useCallback(
    (value: T) => {
      store.arrayAppend(path as never, value);
      sync.notify();
    },
    [store, sync, path],
  );
  const prepend = useCallback(
    (value: T) => {
      store.arrayPrepend(path as never, value);
      sync.notify();
    },
    [store, sync, path],
  );
  const remove = useCallback(
    (index: number) => {
      store.arrayRemove(path as never, index);
      sync.notify();
    },
    [store, sync, path],
  );
  const move = useCallback(
    (from: number, to: number) => {
      store.arrayMove(path as never, from, to);
      sync.notify();
    },
    [store, sync, path],
  );
  const swap = useCallback(
    (a: number, b: number) => {
      store.arraySwap(path as never, a, b);
      sync.notify();
    },
    [store, sync, path],
  );

  return { items, append, prepend, remove, move, swap };
};

export const useWatch = (path: string): unknown => {
  const { form } = useCtx();
  const store = form.store;
  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(path as never, cb),
    [store, path],
  );
  const get = useCallback(() => store.getValue(path as never), [store, path]);
  return useSyncExternalStore(subscribe, get);
};

export const useFormMeta = (): FormState<SignupValues> => {
  const { sync } = useCtx();
  return useSyncExternalStore(sync.subscribe, sync.getSnapshot);
};

export const useFieldStateProbe = (): ((path: string) => FieldState) => {
  const { form } = useCtx();
  return useCallback(
    (path: string) => form.store.getFieldState(path as never),
    [form],
  );
};

export const useCoreActions = () => {
  const { form, sync } = useCtx();
  const submit = useCallback(
    (onValid: (v: SignupValues) => void) => form.submit(onValid),
    [form],
  );
  const trigger = useCallback(
    (target?: Parameters<typeof form.steps.trigger>[0]) =>
      form.steps.trigger(target).then((ok) => {
        sync.notify();
        return ok;
      }),
    [form, sync],
  );
  const resetField = useCallback(
    (path: string) => {
      form.store.resetField(path as never);
      sync.notify();
    },
    [form, sync],
  );
  return { submit, trigger, resetField };
};
