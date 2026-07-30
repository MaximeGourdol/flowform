import { describe, expect, it, vi } from 'vitest';
import { createForm, type FormCore } from './create-form.js';
import type { Plugin } from './plugin.js';

interface Values {
  name: string;
}

const baseOptions = { initialValues: { name: '' } };

interface CounterApi {
  increment(): void;
  count(): number;
}

const counterPlugin = (): Plugin<CounterApi> => ({
  name: 'counter',
  install() {
    let count = 0;
    return {
      increment: () => {
        count += 1;
      },
      count: () => count,
    };
  },
});

describe('use / install', () => {
  it('calls install once when the plugin is registered', () => {
    const install = vi.fn(() => ({}));
    const plugin: Plugin<object> = { name: 'p', install };
    createForm<Values>(baseOptions).use(plugin);
    expect(install).toHaveBeenCalledOnce();
  });

  it('passes the core instance and options to install', () => {
    const install = vi.fn(() => ({}));
    const plugin: Plugin<object> = { name: 'p', install };
    const form = createForm<Values>(baseOptions);
    form.use(plugin, { foo: 1 });
    expect(install).toHaveBeenCalledWith(form, { foo: 1 });
  });

  it('exposes the returned api under the plugin key on the core', () => {
    const form = createForm<Values>(baseOptions).use(counterPlugin());
    const api = (form as FormCore<Values> & { counter: CounterApi }).counter;
    api.increment();
    api.increment();
    expect(api.count()).toBe(2);
  });

  it('returns the core for chaining', () => {
    const form = createForm<Values>(baseOptions);
    expect(form.use(counterPlugin())).toBe(form);
  });

  it('throws when two plugins register under the same name', () => {
    const a: Plugin<object> = { name: 'dup', install: () => ({}) };
    const b: Plugin<object> = { name: 'dup', install: () => ({}) };
    expect(() => createForm<Values>(baseOptions).use(a).use(b)).toThrow();
  });
});

describe('unuse / uninstall', () => {
  it('calls uninstall with the core when present', () => {
    const uninstall = vi.fn();
    const plugin: Plugin<object> = {
      name: 'p',
      install: () => ({}),
      uninstall,
    };
    const form = createForm<Values>(baseOptions).use(plugin);
    form.unuse('p');
    expect(uninstall).toHaveBeenCalledWith(form);
  });

  it('removes the plugin api key from the core', () => {
    const form = createForm<Values>(baseOptions).use(counterPlugin());
    form.unuse('counter');
    expect(
      (form as FormCore<Values> & { counter?: CounterApi }).counter,
    ).toBeUndefined();
  });

  it('is a no-op when unusing an unknown plugin name', () => {
    const form = createForm<Values>(baseOptions);
    expect(() => form.unuse('nope')).not.toThrow();
  });

  it('does not require an uninstall hook', () => {
    const form = createForm<Values>(baseOptions).use(counterPlugin());
    expect(() => form.unuse('counter')).not.toThrow();
  });
});

describe('isolation between plugins', () => {
  it('keeps each plugin api independent under its own key', () => {
    const a = counterPlugin();
    const b: Plugin<{ tag: () => string }> = {
      name: 'tagger',
      install: () => ({ tag: () => 'x' }),
    };
    const form = createForm<Values>(baseOptions).use(a).use(b);
    const typed = form as FormCore<Values> & {
      counter: CounterApi;
      tagger: { tag: () => string };
    };
    typed.counter.increment();
    expect(typed.counter.count()).toBe(1);
    expect(typed.tagger.tag()).toBe('x');
  });

  it('lets plugins communicate only through the event bus', () => {
    const received = vi.fn();
    const emitter: Plugin<object> = {
      name: 'emitter',
      install: (core) => {
        core.bus.emit('field:change', { path: 'name', value: 'z' });
        return {};
      },
    };
    const listener: Plugin<object> = {
      name: 'listener',
      install: (core) => {
        core.bus.on('field:change', received);
        return {};
      },
    };
    createForm<Values>(baseOptions).use(listener).use(emitter);
    expect(received).toHaveBeenCalledWith({ path: 'name', value: 'z' });
  });
});
