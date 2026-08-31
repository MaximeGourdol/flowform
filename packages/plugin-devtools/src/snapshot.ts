import type { ErrorMap, FormCore } from '@formjourney/core';

export interface StateSnapshot {
  readonly values: unknown;
  readonly errors: ErrorMap;
  readonly touched: Readonly<Record<string, boolean>>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly timestamp: number;
}

export const captureSnapshot = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  core: FormCore<any>,
  timestamp: number,
): StateSnapshot => {
  const state = core.store.getState();
  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    dirty: state.dirty,
    timestamp,
  };
};
