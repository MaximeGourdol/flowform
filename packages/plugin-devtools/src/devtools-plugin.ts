import type { EventKey, Plugin, Unsubscribe } from '@flowform/core';
import {
  createEventLog,
  type EventLog,
  type EventLogOptions,
  type LoggedEvent,
  type LogListener,
} from './event-log.js';
import { captureSnapshot, type StateSnapshot } from './snapshot.js';
import { replayEvents } from './replay.js';

const CORE_EVENTS: readonly EventKey[] = [
  'field:change',
  'field:blur',
  'step:change',
  'validate:start',
  'validate:end',
  'submit:start',
  'submit:end',
];

export interface DevtoolsOptions extends EventLogOptions {
  readonly events?: readonly EventKey[];
  readonly now?: () => number;
}

export interface DevtoolsApi {
  readonly getEventLog: () => readonly LoggedEvent[];
  readonly getSnapshot: () => StateSnapshot;
  readonly subscribeToLog: (listener: LogListener) => Unsubscribe;
  readonly clearLog: () => void;
  readonly replay: (fromIndex: number, toIndex: number) => void;
}

export const devtoolsPlugin = (
  options?: DevtoolsOptions,
): Plugin<DevtoolsApi> => {
  const now = options?.now ?? (() => Date.now());
  const tracked = options?.events ?? CORE_EVENTS;

  const state = new WeakMap<
    object,
    { readonly log: EventLog; readonly offHandlers: Unsubscribe[] }
  >();

  return {
    name: 'devtools',
    install: (core) => {
      const log: EventLog = createEventLog(options);
      const offHandlers: Unsubscribe[] = [];
      let replaying = false;
      state.set(core, { log, offHandlers });

      for (const type of tracked) {
        const off = core.bus.on(type, (payload) => {
          if (replaying) {
            return;
          }
          const timestamp = now();
          log.append(
            type,
            payload,
            timestamp,
            captureSnapshot(core, timestamp),
          );
        });
        offHandlers.push(off);
      }

      return {
        getEventLog: () => log.entries(),
        getSnapshot: () => captureSnapshot(core, now()),
        subscribeToLog: (listener) => log.subscribe(listener),
        clearLog: () => {
          log.clear();
        },
        replay: (fromIndex, toIndex) => {
          replaying = true;
          try {
            replayEvents({ bus: core.bus, log }, fromIndex, toIndex);
          } finally {
            replaying = false;
          }
        },
      };
    },
    uninstall: (core) => {
      const entry = state.get(core);
      if (entry === undefined) {
        return;
      }
      for (const off of entry.offHandlers) {
        off();
      }
      entry.offHandlers.length = 0;
      entry.log.clear();
      state.delete(core);
    },
  };
};
