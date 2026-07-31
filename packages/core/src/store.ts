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

const isPlainObject = (value: unknown): value is UnknownRecord => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
};

const cloneInner = <T>(value: T, seen: WeakMap<object, unknown>): T => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const existing = seen.get(value);
  if (existing !== undefined) {
    return existing as T;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (const item of value as unknown[]) {
      out.push(cloneInner(item, seen));
    }
    return out as T;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();
    seen.set(value, out);
    for (const [k, v] of value) {
      out.set(k, cloneInner(v, seen));
    }
    return out as T;
  }
  if (value instanceof Set) {
    const out = new Set<unknown>();
    seen.set(value, out);
    for (const v of value) {
      out.add(cloneInner(v, seen));
    }
    return out as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: UnknownRecord = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) {
    out[key] = cloneInner(value[key], seen);
  }
  return out as T;
};

const clone = <T>(value: T): T =>
  cloneInner(value, new WeakMap<object, unknown>());

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
  const isIndex = (segment: string): boolean => /^\d+$/.test(segment);
  let cursor: UnknownRecord = target;
  for (const [i, segment] of parents.entries()) {
    const next = cursor[segment];
    if (!isRecord(next) && !Array.isArray(next)) {
      const childSegment = segments[i + 1];
      cursor[segment] =
        childSegment !== undefined && isIndex(childSegment) ? [] : {};
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

  const isContainer = (value: unknown): value is UnknownRecord =>
    (isRecord(value) || Array.isArray(value)) &&
    !(value instanceof Date) &&
    !(value instanceof Map) &&
    !(value instanceof Set);

  const containerKeys = (value: UnknownRecord): string[] =>
    Array.isArray(value) ? value.map((_, i) => String(i)) : Object.keys(value);

  const dirty = (): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    const walk = (base: unknown, current: unknown, prefix: string): void => {
      const baseContainer = isContainer(base);
      const currentContainer = isContainer(current);
      if (baseContainer && currentContainer) {
        const keys = new Set([
          ...containerKeys(base),
          ...containerKeys(current),
        ]);
        for (const key of keys) {
          const nextPrefix = prefix === '' ? key : `${prefix}.${key}`;
          walk(base[key], current[key], nextPrefix);
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

  const deepMerge = (base: unknown, patch: unknown): unknown => {
    if (!isPlainObject(base) || !isPlainObject(patch)) {
      return clone(patch);
    }
    const out: UnknownRecord = { ...base };
    for (const key of Object.keys(patch)) {
      out[key] = deepMerge(base[key], patch[key]);
    }
    return out;
  };

  const reset = (partial?: Partial<TValues>): void => {
    const next =
      partial === undefined
        ? clone(initialValues)
        : (deepMerge(clone(initialValues), clone(partial)) as TValues);
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
