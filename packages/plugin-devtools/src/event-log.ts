import type { EventKey, EventMap, Unsubscribe } from '@flowform/core';
import type { StateSnapshot } from './snapshot.js';

export interface LoggedEvent<K extends EventKey = EventKey> {
  readonly v: number;
  readonly type: K;
  readonly payload: EventMap[K];
  readonly timestamp: number;
  readonly snapshot: StateSnapshot;
}

export type LogListener = (log: readonly LoggedEvent[]) => void;

export interface EventLogOptions {
  readonly schemaVersion?: number;
  readonly maxEntries?: number;
}

export interface EventLog {
  readonly append: <K extends EventKey>(
    type: K,
    payload: EventMap[K],
    timestamp: number,
    snapshot: StateSnapshot,
  ) => void;
  readonly entries: () => readonly LoggedEvent[];
  readonly slice: (
    fromIndex: number,
    toIndex: number,
  ) => readonly LoggedEvent[];
  readonly subscribe: (listener: LogListener) => Unsubscribe;
  readonly clear: () => void;
}

const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 1000;

export const createEventLog = (options?: EventLogOptions): EventLog => {
  const version = options?.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;

  let log: LoggedEvent[] = [];
  const listeners = new Set<LogListener>();
  let flushScheduled = false;

  const flush = (): void => {
    flushScheduled = false;
    const frozen = log.slice();
    for (const listener of [...listeners]) {
      listener(frozen);
    }
  };

  const scheduleFlush = (): void => {
    if (flushScheduled) {
      return;
    }
    flushScheduled = true;
    queueMicrotask(flush);
  };

  const append = <K extends EventKey>(
    type: K,
    payload: EventMap[K],
    timestamp: number,
    snapshot: StateSnapshot,
  ): void => {
    const entry: LoggedEvent<K> = {
      v: version,
      type,
      payload,
      timestamp,
      snapshot,
    };
    log.push(entry);
    if (log.length > maxEntries) {
      log = log.slice(log.length - maxEntries);
    }
    scheduleFlush();
  };

  const entries = (): readonly LoggedEvent[] => log.slice();

  const slice = (
    fromIndex: number,
    toIndex: number,
  ): readonly LoggedEvent[] => {
    const start = Math.max(0, Math.min(fromIndex, log.length));
    const end = Math.max(start, Math.min(toIndex, log.length));
    return log.slice(start, end);
  };

  const subscribe = (listener: LogListener): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const clear = (): void => {
    log = [];
    scheduleFlush();
  };

  return { append, entries, slice, subscribe, clear };
};
