import type { FormCore, Plugin, Unsubscribe } from '@flowform/core';
import { describe, expectTypeOf, it } from 'vitest';
import {
  devtoolsPlugin,
  type DevtoolsApi,
  type DevtoolsOptions,
} from './devtools-plugin.js';
import type { LoggedEvent, LogListener } from './event-log.js';
import type { StateSnapshot } from './snapshot.js';

describe('devtoolsPlugin typing', () => {
  it('returns a Plugin carrying DevtoolsApi', () => {
    expectTypeOf(devtoolsPlugin()).toEqualTypeOf<Plugin<DevtoolsApi>>();
  });

  it('accepts DevtoolsOptions', () => {
    expectTypeOf(devtoolsPlugin)
      .parameter(0)
      .toEqualTypeOf<DevtoolsOptions | undefined>();
  });

  it('install returns the DevtoolsApi', () => {
    const plugin = devtoolsPlugin();
    expectTypeOf(plugin.install).returns.toEqualTypeOf<DevtoolsApi>();
    expectTypeOf(plugin.install).parameter(0).toExtend<FormCore<unknown>>();
  });
});

describe('DevtoolsApi surface', () => {
  it('getEventLog returns a readonly LoggedEvent array', () => {
    expectTypeOf<DevtoolsApi['getEventLog']>().toEqualTypeOf<
      () => readonly LoggedEvent[]
    >();
  });

  it('getSnapshot returns a StateSnapshot', () => {
    expectTypeOf<DevtoolsApi['getSnapshot']>().toEqualTypeOf<
      () => StateSnapshot
    >();
  });

  it('subscribeToLog takes a LogListener and returns an Unsubscribe', () => {
    expectTypeOf<DevtoolsApi['subscribeToLog']>().toEqualTypeOf<
      (listener: LogListener) => Unsubscribe
    >();
  });

  it('clearLog returns void', () => {
    expectTypeOf<DevtoolsApi['clearLog']>().toEqualTypeOf<() => void>();
  });

  it('replay takes two indices', () => {
    expectTypeOf<DevtoolsApi['replay']>().toEqualTypeOf<
      (fromIndex: number, toIndex: number) => void
    >();
  });
});
