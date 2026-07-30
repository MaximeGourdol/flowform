import { describe, expectTypeOf, it } from 'vitest';
import { createForm } from './create-form.js';
import type { Plugin } from './plugin.js';

interface AnalyticsApi {
  track(event: string): void;
  flush(): Promise<void>;
}

declare module './plugin.js' {
  interface FormPluginRegistry {
    analytics: AnalyticsApi;
  }
}

const analyticsPlugin = (): Plugin<AnalyticsApi> => ({
  name: 'analytics',
  install: () => ({
    track: () => undefined,
    flush: () => Promise.resolve(),
  }),
});

interface Values {
  name: string;
}

const form = createForm<Values>({ initialValues: { name: '' } }).use(
  analyticsPlugin(),
);

describe('FormPluginRegistry augmentation', () => {
  it('exposes the augmented api as a typed property on the core', () => {
    expectTypeOf(form.analytics).toEqualTypeOf<AnalyticsApi>();
    expectTypeOf(form.analytics.track).toBeFunction();
    expectTypeOf(form.analytics.flush).returns.toEqualTypeOf<Promise<void>>();
  });

  it('rejects access to a method that does not exist on the api', () => {
    // @ts-expect-error - `doesNotExist` is not part of AnalyticsApi
    form.analytics.doesNotExist();
  });

  it('rejects a plugin whose install return type does not match TApi', () => {
    const bad: Plugin<AnalyticsApi> = {
      name: 'analytics',
      // @ts-expect-error - missing `flush`, does not satisfy AnalyticsApi
      install: () => ({ track: () => undefined }),
    };
    expectTypeOf(bad).toEqualTypeOf<Plugin<AnalyticsApi>>();
  });
});

describe('Plugin<TApi> contract', () => {
  it('infers TApi from the install return value', () => {
    const p = analyticsPlugin();
    expectTypeOf(p.install).returns.toEqualTypeOf<AnalyticsApi>();
  });
});
