export { devtoolsPlugin } from './devtools-plugin.js';
export type { DevtoolsApi, DevtoolsOptions } from './devtools-plugin.js';

export { createEventLog } from './event-log.js';
export type {
  EventLog,
  EventLogOptions,
  LoggedEvent,
  LogListener,
} from './event-log.js';

export { captureSnapshot } from './snapshot.js';
export type { StateSnapshot } from './snapshot.js';

export { replayEvents } from './replay.js';
export type { ReplayOptions } from './replay.js';

import type { DevtoolsApi } from './devtools-plugin.js';

declare module '@formjourney/core' {
  interface FormPluginRegistry {
    devtools: DevtoolsApi;
  }
}
