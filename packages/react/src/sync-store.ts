import type { FormCore, FormState, Unsubscribe } from '@flowform/core';

export interface SyncStore<TValues> {
  readonly subscribe: (listener: () => void) => Unsubscribe;
  readonly getSnapshot: () => FormState<TValues>;
  readonly notify: () => void;
  readonly dispose: () => void;
}

const shallowEqualErrors = (
  a: Readonly<Record<string, readonly string[]>>,
  b: Readonly<Record<string, readonly string[]>>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => a[key] === b[key]);
};

const shallowEqualFlags = (
  a: Readonly<Record<string, boolean>>,
  b: Readonly<Record<string, boolean>>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => a[key] === b[key]);
};

const sameSnapshot = <TValues>(
  a: FormState<TValues>,
  b: FormState<TValues>,
): boolean =>
  a.values === b.values &&
  a.isSubmitting === b.isSubmitting &&
  a.isValidating === b.isValidating &&
  shallowEqualErrors(a.errors, b.errors) &&
  shallowEqualFlags(a.touched, b.touched) &&
  shallowEqualFlags(a.dirty, b.dirty);

export const createSyncStore = <TValues>(
  form: FormCore<TValues>,
): SyncStore<TValues> => {
  const listeners = new Set<() => void>();
  let snapshot = form.store.getState();

  const recompute = (): void => {
    const next = form.store.getState();
    if (sameSnapshot(snapshot, next)) {
      return;
    }
    snapshot = next;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const offHandlers: Unsubscribe[] = [
    form.store.subscribeAll(recompute),
    form.bus.on('step:change', recompute),
    form.bus.on('validate:end', recompute),
    form.bus.on('submit:start', recompute),
    form.bus.on('submit:end', recompute),
  ];

  const subscribe = (listener: () => void): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = (): FormState<TValues> => snapshot;

  const dispose = (): void => {
    for (const off of offHandlers) {
      off();
    }
    listeners.clear();
  };

  return { subscribe, getSnapshot, notify: recompute, dispose };
};
