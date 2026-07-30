import type { ErrorMap, Path, PathValue, Unsubscribe } from './types.js';

export interface FormState<TValues> {
  readonly values: TValues;
  readonly errors: ErrorMap;
  readonly touched: Readonly<Record<string, boolean>>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
}

export type StoreListener<TValue> = (value: TValue) => void;

export interface FormStore<TValues> {
  getValue<P extends Path<TValues>>(path: P): PathValue<TValues, P & string>;
  setValue<P extends Path<TValues>>(
    path: P,
    value: PathValue<TValues, P & string>,
  ): void;
  subscribe<P extends Path<TValues>>(
    path: P,
    listener: StoreListener<PathValue<TValues, P & string>>,
  ): Unsubscribe;
  getState(): FormState<TValues>;
  setErrors(errors: ErrorMap): void;
  setTouched(path: Path<TValues>, touched: boolean): void;
  setSubmitting(isSubmitting: boolean): void;
  setValidating(isValidating: boolean): void;
  reset(partial?: Partial<TValues>): void;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const clone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => clone(item)) as T;
  }
  if (isRecord(value)) {
    const out: UnknownRecord = {};
    for (const key of Object.keys(value)) {
      out[key] = clone(value[key]);
    }
    return out as T;
  }
  return value;
};

const readPath = (source: unknown, path: string): unknown => {
  const segments = path.split('.');
  let cursor: unknown = source;
  for (const segment of segments) {
    if (!isRecord(cursor) && !Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as UnknownRecord)[segment];
  }
  return cursor;
};

const writePath = (
  target: UnknownRecord,
  path: string,
  value: unknown,
): void => {
  const segments = path.split('.');
  const last = segments.at(-1);
  if (last === undefined) {
    return;
  }
  const parents = segments.slice(0, -1);
  let cursor: UnknownRecord = target;
  for (const segment of parents) {
    const next = cursor[segment];
    if (!isRecord(next) && !Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as UnknownRecord;
  }
  cursor[last] = value;
};

export const createStore = <TValues>(
  initialValues: TValues,
): FormStore<TValues> => {
  let baseline = clone(initialValues);
  let values = clone(initialValues);
  let errors: ErrorMap = {};
  let touched: Record<string, boolean> = {};
  let isSubmitting = false;
  let isValidating = false;

  const listeners = new Map<string, Set<(value: unknown) => void>>();

  const dirty = (): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    const walk = (base: unknown, current: unknown, prefix: string): void => {
      if (isRecord(current) || Array.isArray(current)) {
        const keys = Array.isArray(current)
          ? current.map((_, i) => String(i))
          : Object.keys(current);
        for (const key of keys) {
          const nextPrefix = prefix === '' ? key : `${prefix}.${key}`;
          const baseChild =
            isRecord(base) || Array.isArray(base)
              ? (base as UnknownRecord)[key]
              : undefined;
          walk(baseChild, (current as UnknownRecord)[key], nextPrefix);
        }
        return;
      }
      if (!Object.is(base, current)) {
        out[prefix] = true;
      }
    };
    walk(baseline, values, '');
    return out;
  };

  const notify = (path: string, value: unknown): void => {
    const set = listeners.get(path);
    if (set === undefined) {
      return;
    }
    for (const listener of set) {
      listener(value);
    }
  };

  const getValue = <P extends Path<TValues>>(
    path: P,
  ): PathValue<TValues, P & string> =>
    readPath(values, path) as PathValue<TValues, P & string>;

  const setValue = <P extends Path<TValues>>(
    path: P,
    value: PathValue<TValues, P & string>,
  ): void => {
    const previous = readPath(values, path);
    if (Object.is(previous, value)) {
      return;
    }
    writePath(values as UnknownRecord, path, value);
    notify(path, value);
  };

  const subscribe = <P extends Path<TValues>>(
    path: P,
    listener: StoreListener<PathValue<TValues, P & string>>,
  ): Unsubscribe => {
    const set = listeners.get(path) ?? new Set();
    set.add(listener as (value: unknown) => void);
    listeners.set(path, set);
    return () => {
      set.delete(listener as (value: unknown) => void);
      if (set.size === 0) {
        listeners.delete(path);
      }
    };
  };

  const getState = (): FormState<TValues> => ({
    values: clone(values),
    errors,
    touched: { ...touched },
    dirty: dirty(),
    isSubmitting,
    isValidating,
  });

  const setErrors = (next: ErrorMap): void => {
    errors = next;
  };

  const setTouched = (path: Path<TValues>, value: boolean): void => {
    touched = { ...touched, [path]: value };
  };

  const setSubmitting = (value: boolean): void => {
    isSubmitting = value;
  };

  const setValidating = (value: boolean): void => {
    isValidating = value;
  };

  const reset = (partial?: Partial<TValues>): void => {
    const next =
      partial === undefined
        ? clone(initialValues)
        : { ...clone(initialValues), ...clone(partial) };
    baseline = clone(next);
    values = clone(next);
    errors = {};
    touched = {};
  };

  return {
    getValue,
    setValue,
    subscribe,
    getState,
    setErrors,
    setTouched,
    setSubmitting,
    setValidating,
    reset,
  };
};
