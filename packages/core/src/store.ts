import type { ErrorMap, Path, PathValue, Unsubscribe } from './types.js';

export interface FormState<TValues> {
  readonly values: TValues;
  readonly errors: ErrorMap;
  readonly touched: Readonly<Record<string, boolean>>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly submitCount: number;
  readonly dirtyFields: Readonly<Record<string, boolean>>;
  readonly touchedFields: Readonly<Record<string, boolean>>;
}

export interface FieldState {
  readonly error: string | undefined;
  readonly errors: readonly string[];
  readonly isDirty: boolean;
  readonly isTouched: boolean;
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
  subscribeAll(listener: () => void): Unsubscribe;
  getState(): FormState<TValues>;
  setErrors(errors: ErrorMap): void;
  setError(path: Path<TValues>, messages: readonly string[]): void;
  clearErrors(path?: Path<TValues>): void;
  getFieldState(path: Path<TValues>): FieldState;
  setTouched(path: Path<TValues>, touched: boolean): void;
  setSubmitting(isSubmitting: boolean): void;
  setValidating(isValidating: boolean): void;
  incrementSubmitCount(): void;
  reset(partial?: Partial<TValues>): void;
  resetField(path: Path<TValues>): void;
  arrayAppend(path: Path<TValues>, value: unknown): void;
  arrayPrepend(path: Path<TValues>, value: unknown): void;
  arrayInsert(path: Path<TValues>, index: number, value: unknown): void;
  arrayRemove(path: Path<TValues>, index: number): void;
  arrayMove(path: Path<TValues>, from: number, to: number): void;
  arraySwap(path: Path<TValues>, a: number, b: number): void;
  arrayReplace(path: Path<TValues>, values: readonly unknown[]): void;
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
  let submitCount = 0;

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

  const globalListeners = new Set<() => void>();

  const notifyAll = (): void => {
    for (const listener of [...globalListeners]) {
      listener();
    }
  };

  const notify = (path: string, value: unknown): void => {
    const set = listeners.get(path);
    if (set !== undefined) {
      for (const listener of set) {
        listener(value);
      }
    }
    notifyAll();
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

  const subscribeAll = (listener: () => void): Unsubscribe => {
    globalListeners.add(listener);
    return () => {
      globalListeners.delete(listener);
    };
  };

  const getState = (): FormState<TValues> => {
    const dirtyMap = dirty();
    return {
      values: clone(values),
      errors,
      touched: { ...touched },
      dirty: dirtyMap,
      isSubmitting,
      isValidating,
      isDirty: Object.keys(dirtyMap).length > 0,
      isValid: !Object.values(errors).some((messages) => messages.length > 0),
      submitCount,
      dirtyFields: dirtyMap,
      touchedFields: { ...touched },
    };
  };

  const setErrors = (next: ErrorMap): void => {
    errors = next;
    notifyAll();
  };

  const setError = (path: Path<TValues>, messages: readonly string[]): void => {
    errors = { ...errors, [path]: messages };
    notifyAll();
  };

  const clearErrors = (path?: Path<TValues>): void => {
    if (path === undefined) {
      errors = {};
      notifyAll();
      return;
    }
    const prefix = `${path}.`;
    const next: Record<string, readonly string[]> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (key !== path && !key.startsWith(prefix)) {
        next[key] = value;
      }
    }
    errors = next;
    notifyAll();
  };

  const getFieldState = (path: Path<TValues>): FieldState => {
    const fieldErrors = errors[path] ?? [];
    return {
      error: fieldErrors[0],
      errors: fieldErrors,
      isDirty: dirty()[path] === true,
      isTouched: touched[path] === true,
    };
  };

  const incrementSubmitCount = (): void => {
    submitCount += 1;
    notifyAll();
  };

  const setTouched = (path: Path<TValues>, value: boolean): void => {
    touched = { ...touched, [path]: value };
    notifyAll();
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
    notifyAll();
  };

  const resetField = (path: Path<TValues>): void => {
    const initial = readPath(initialValues, path);
    writePath(values as UnknownRecord, path, clone(initial));
    clearErrors(path);
    const prefix = `${path}.`;
    const nextTouched: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(touched)) {
      if (key !== path && !key.startsWith(prefix)) {
        nextTouched[key] = value;
      }
    }
    touched = nextTouched;
    notify(path, readPath(values, path));
  };

  const readArray = (path: string): unknown[] => {
    const current = readPath(values, path);
    return Array.isArray(current) ? [...(current as unknown[])] : [];
  };

  const remapIndexed = (
    map: Record<string, readonly string[] | boolean>,
    arrayPath: string,
    move: (index: number) => number | null,
  ): Record<string, readonly string[] | boolean> => {
    const prefix = `${arrayPath}.`;
    const out: Record<string, readonly string[] | boolean> = {};
    for (const [key, value] of Object.entries(map)) {
      if (!key.startsWith(prefix)) {
        out[key] = value;
        continue;
      }
      const rest = key.slice(prefix.length);
      const dot = rest.indexOf('.');
      const indexPart = dot === -1 ? rest : rest.slice(0, dot);
      const tail = dot === -1 ? '' : rest.slice(dot);
      if (!/^\d+$/.test(indexPart)) {
        out[key] = value;
        continue;
      }
      const nextIndex = move(Number(indexPart));
      if (nextIndex === null) {
        continue;
      }
      out[`${arrayPath}.${String(nextIndex)}${tail}`] = value;
    }
    return out;
  };

  const reindex = (
    arrayPath: string,
    move: (index: number) => number | null,
  ): void => {
    errors = remapIndexed(errors, arrayPath, move) as ErrorMap;
    touched = remapIndexed(touched, arrayPath, move) as Record<string, boolean>;
  };

  const writeArray = (path: string, next: unknown[]): void => {
    writePath(values as UnknownRecord, path, next);
    notify(path, next);
  };

  const arrayInsert = (
    path: Path<TValues>,
    index: number,
    value: unknown,
  ): void => {
    const next = readArray(path);
    const at = Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, clone(value));
    reindex(path, (i) => (i >= at ? i + 1 : i));
    writeArray(path, next);
  };

  const arrayAppend = (path: Path<TValues>, value: unknown): void => {
    const next = readArray(path);
    next.push(clone(value));
    writeArray(path, next);
  };

  const arrayPrepend = (path: Path<TValues>, value: unknown): void => {
    arrayInsert(path, 0, value);
  };

  const arrayRemove = (path: Path<TValues>, index: number): void => {
    const next = readArray(path);
    if (index < 0 || index >= next.length) {
      return;
    }
    next.splice(index, 1);
    reindex(path, (i) => {
      if (i === index) {
        return null;
      }
      return i > index ? i - 1 : i;
    });
    writeArray(path, next);
  };

  const arrayMove = (path: Path<TValues>, from: number, to: number): void => {
    const next = readArray(path);
    if (
      from < 0 ||
      from >= next.length ||
      to < 0 ||
      to >= next.length ||
      from === to
    ) {
      return;
    }
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    reindex(path, (i) => {
      if (i === from) {
        return to;
      }
      if (from < to) {
        return i > from && i <= to ? i - 1 : i;
      }
      return i >= to && i < from ? i + 1 : i;
    });
    writeArray(path, next);
  };

  const arraySwap = (path: Path<TValues>, a: number, b: number): void => {
    const next = readArray(path);
    if (a < 0 || a >= next.length || b < 0 || b >= next.length || a === b) {
      return;
    }
    const tmp = next[a];
    next[a] = next[b];
    next[b] = tmp;
    reindex(path, (i) => {
      if (i === a) {
        return b;
      }
      if (i === b) {
        return a;
      }
      return i;
    });
    writeArray(path, next);
  };

  const arrayReplace = (
    path: Path<TValues>,
    nextValues: readonly unknown[],
  ): void => {
    reindex(path, () => null);
    writeArray(path, clone([...nextValues]));
  };

  return {
    getValue,
    setValue,
    subscribe,
    subscribeAll,
    getState,
    setErrors,
    setError,
    clearErrors,
    getFieldState,
    setTouched,
    setSubmitting,
    setValidating,
    incrementSubmitCount,
    reset,
    resetField,
    arrayAppend,
    arrayPrepend,
    arrayInsert,
    arrayRemove,
    arrayMove,
    arraySwap,
    arrayReplace,
  };
};
