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
});
