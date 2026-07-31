import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type FormStore } from './store.js';

interface Values {
  user: { name: string; email: string; tags: string[] };
  agree: boolean;
}

const initial: Values = {
  user: { name: 'Ada', email: 'ada@example.com', tags: ['a', 'b'] },
  agree: false,
};

let store: FormStore<Values>;

beforeEach(() => {
  store = createStore<Values>(initial);
});

describe('createStore / getValue', () => {
  it('reads a top-level value', () => {
    expect(store.getValue('agree')).toBe(false);
  });

  it('reads a nested value', () => {
    expect(store.getValue('user.name')).toBe('Ada');
  });

  it('reads an array element by index', () => {
    expect(store.getValue('user.tags.0')).toBe('a');
  });
});

describe('setValue', () => {
  it('updates a nested value', () => {
    store.setValue('user.name', 'Grace');
    expect(store.getValue('user.name')).toBe('Grace');
  });

  it('does not mutate the original initialValues object', () => {
    store.setValue('user.name', 'Grace');
    expect(initial.user.name).toBe('Ada');
  });

  it('marks the field dirty once it differs from initial', () => {
    expect(store.getState().dirty['user.name']).toBeFalsy();
    store.setValue('user.name', 'Grace');
    expect(store.getState().dirty['user.name']).toBe(true);
  });
});

describe('subscribe', () => {
  it('notifies the listener with the new value on change', () => {
    const listener = vi.fn();
    store.subscribe('user.name', listener);
    store.setValue('user.name', 'Grace');
    expect(listener).toHaveBeenCalledWith('Grace');
  });

  it('is selective: user.email change does not fire user.name listener', () => {
    const listener = vi.fn();
    store.subscribe('user.name', listener);
    store.setValue('user.email', 'grace@example.com');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsub = store.subscribe('user.name', listener);
    unsub();
    store.setValue('user.name', 'Grace');
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not fire when the value is set to an equal value', () => {
    const listener = vi.fn();
    store.subscribe('agree', listener);
    store.setValue('agree', false);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('getState', () => {
  it('exposes the full state shape with defaults', () => {
    const state = store.getState();
    expect(state.values).toEqual(initial);
    expect(state.errors).toEqual({});
    expect(state.touched).toEqual({});
    expect(state.dirty).toEqual({});
    expect(state.isSubmitting).toBe(false);
    expect(state.isValidating).toBe(false);
  });
});

describe('setErrors / setTouched / flags', () => {
  it('stores errors verbatim (store does not validate)', () => {
    store.setErrors({ 'user.email': ['invalid'] });
    expect(store.getState().errors).toEqual({ 'user.email': ['invalid'] });
  });

  it('marks a field touched', () => {
    store.setTouched('user.email', true);
    expect(store.getState().touched['user.email']).toBe(true);
  });

  it('toggles isSubmitting and isValidating', () => {
    store.setSubmitting(true);
    expect(store.getState().isSubmitting).toBe(true);
    store.setValidating(true);
    expect(store.getState().isValidating).toBe(true);
  });
});

describe('reset', () => {
  it('reverts values to initial and clears dirty/errors/touched', () => {
    store.setValue('user.name', 'Grace');
    store.setErrors({ 'user.name': ['x'] });
    store.setTouched('user.name', true);
    store.reset();
    expect(store.getValue('user.name')).toBe('Ada');
    expect(store.getState().dirty).toEqual({});
    expect(store.getState().errors).toEqual({});
    expect(store.getState().touched).toEqual({});
  });

  it('applies a partial patch as the new baseline', () => {
    store.reset({ agree: true });
    expect(store.getValue('agree')).toBe(true);
    expect(store.getState().dirty).toEqual({});
  });

  it('deep-merges a partial patch without dropping sibling nested keys', () => {
    const s = createStore<Values>(initial);
    s.reset({ user: { name: 'Grace' } as Values['user'] });
    expect(s.getValue('user.name')).toBe('Grace');
    expect(s.getValue('user.email')).toBe('ada@example.com');
    expect(s.getValue('user.tags')).toEqual(['a', 'b']);
  });
});

describe('clone / non-plain values', () => {
  it('preserves Date instances instead of turning them into {}', () => {
    const dated = createStore<{ birthday: Date }>({
      birthday: new Date('2020-01-01T00:00:00.000Z'),
    });
    const value = dated.getValue('birthday');
    expect(value).toBeInstanceOf(Date);
    expect(value.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });

  it('does not overflow the stack on a cyclic initial value', () => {
    interface Node {
      readonly self?: Node;
    }
    const cyclic: { node: Node } = { node: {} };
    (cyclic.node as { self?: Node }).self = cyclic.node;
    expect(() => createStore<{ node: Node }>(cyclic)).not.toThrow();
  });
});

describe('setValue / array creation', () => {
  it('creates an array when writing a fresh numeric path on a missing parent', () => {
    const s = createStore<{ matrix: Record<string, string[]> }>({ matrix: {} });
    s.setValue('matrix.row.0' as never, 'x' as never);
    expect(Array.isArray(s.getState().values.matrix.row)).toBe(true);
  });
});

describe('dirty / removals', () => {
  it('reports an array that lost an element as dirty', () => {
    const s = createStore<{ tags: string[] }>({ tags: ['a', 'b'] });
    s.setValue('tags', ['a']);
    expect(s.getState().dirty).not.toEqual({});
  });
});
