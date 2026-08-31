import type { EventBus } from '@formjourney/core';
import type { EventLog } from './event-log.js';

export interface ReplayOptions {
  readonly bus: EventBus;
  readonly log: EventLog;
}

export const replayEvents = (
  options: ReplayOptions,
  fromIndex: number,
  toIndex: number,
): void => {
  const window = options.log.slice(fromIndex, toIndex);
  for (const entry of window) {
    options.bus.emit(entry.type, entry.payload);
  }
};
