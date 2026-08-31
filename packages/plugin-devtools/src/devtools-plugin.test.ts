import { describe, expect, it } from 'vitest';
import { createForm, type FormCore } from '@formjourney/core';
import { devtoolsPlugin, type DevtoolsApi } from './devtools-plugin.js';

interface Values {
  name: string;
}

let counter = 0;
const now = (): number => ++counter;

const makeForm = (): FormCore<Values> =>
  createForm<Values>({ initialValues: { name: '' }, steps: [{ id: 'a' }] });

const devtools = (form: FormCore<Values>): DevtoolsApi =>
  (form as unknown as { devtools: DevtoolsApi }).devtools;

describe('devtoolsPlugin — logging', () => {
  it('logs emitted events with the versioned envelope', () => {
    const form = makeForm().use(devtoolsPlugin({ now }));
    form.bus.emit('field:change', { path: 'name', value: 'Ada' });
    const log = devtools(form).getEventLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.type).toBe('field:change');
    expect(log[0]?.v).toBe(1);
  });

  it('captures an independent snapshot per event', () => {
    const form = makeForm().use(devtoolsPlugin({ now }));
    form.store.setValue('name', 'a');
    form.bus.emit('field:change', { path: 'name', value: 'a' });
    form.store.setValue('name', 'b');
    form.bus.emit('field:change', { path: 'name', value: 'b' });
    const log = devtools(form).getEventLog();
    expect((log[0]?.snapshot.values as Values).name).toBe('a');
    expect((log[1]?.snapshot.values as Values).name).toBe('b');
  });
});

describe('devtoolsPlugin — isolation across cores', () => {
  it('keeps a separate log per installed core', () => {
    const a = makeForm().use(devtoolsPlugin({ now }));
    const b = makeForm().use(devtoolsPlugin({ now }));
    a.bus.emit('field:change', { path: 'name', value: 'x' });
    expect(devtools(a).getEventLog()).toHaveLength(1);
    expect(devtools(b).getEventLog()).toHaveLength(0);
  });

  it('does not share state when the same plugin object is used on two cores', () => {
    const plugin = devtoolsPlugin({ now });
    const a = makeForm().use(plugin);
    const b = makeForm().use(plugin);
    a.bus.emit('field:change', { path: 'name', value: 'x' });
    expect(devtools(b).getEventLog()).toHaveLength(0);
  });
});

describe('devtoolsPlugin — replay', () => {
  it('does not re-log its own events while replaying', () => {
    const form = makeForm().use(devtoolsPlugin({ now }));
    form.bus.emit('field:change', { path: 'name', value: 'a' });
    form.bus.emit('field:change', { path: 'name', value: 'b' });
    const before = devtools(form).getEventLog().length;
    devtools(form).replay(0, before);
    expect(devtools(form).getEventLog()).toHaveLength(before);
  });

  it('re-emits replayed events on the bus for other listeners', () => {
    const form = makeForm().use(devtoolsPlugin({ now }));
    form.bus.emit('field:change', { path: 'name', value: 'a' });
    const seen: unknown[] = [];
    form.bus.on('field:change', (p) => seen.push(p.value));
    devtools(form).replay(0, 1);
    expect(seen).toEqual(['a']);
  });
});
