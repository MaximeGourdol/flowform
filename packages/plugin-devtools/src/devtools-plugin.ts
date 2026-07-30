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

  const log: EventLog = createEventLog(options);
  const offHandlers: Unsubscribe[] = [];

  return {
    name: 'devtools',
    install: (core) => {
      for (const type of tracked) {
        const off = core.bus.on(type, (payload) => {
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
          replayEvents({ bus: core.bus, log }, fromIndex, toIndex);
        },
      };
    },
    uninstall: () => {
      for (const off of offHandlers) {
        off();
      }
      offHandlers.length = 0;
      log.clear();
    },
  };
};
