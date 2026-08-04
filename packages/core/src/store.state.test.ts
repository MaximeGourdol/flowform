import { describe, expect, it, vi } from 'vitest';
import { createStore, type FormStore } from './store.js';

interface Values {
  profile: { name: string; age: number };
  tags: string[];
}

const make = (): FormStore<Values> =>
  createStore<Values>({ profile: { name: '', age: 0 }, tags: [] });

describe('store granular errors', () => {
  it('setError sets a single path', () => {
    const s = make();
    s.setError('profile.name', ['required']);
    expect(s.getState().errors['profile.name']).toEqual(['required']);
  });

  it('clearErrors(path) removes that path and its subpaths', () => {
    const s = make();
    s.setError('profile.name', ['a']);
    s.setError('profile.age', ['b']);
    s.clearErrors('profile.name');
    const { errors } = s.getState();
    expect(errors['profile.name']).toBeUndefined();
    expect(errors['profile.age']).toEqual(['b']);
  });

  it('clearErrors() with no path removes everything', () => {
    const s = make();
    s.setError('profile.name', ['a']);
    s.clearErrors();
    expect(Object.keys(s.getState().errors)).toHaveLength(0);
  });

  it('clearErrors on a parent path clears nested children', () => {
    const s = make();
    s.setError('profile.name', ['a']);
    s.setError('profile.age', ['b']);
    s.clearErrors('profile');
    expect(Object.keys(s.getState().errors)).toHaveLength(0);
  });

  it('getFieldState reflects error, dirty and touched', () => {
    const s = make();
    s.setValue('profile.name', 'Ada');
    s.setTouched('profile.name', true);
    s.setError('profile.name', ['bad', 'worse']);
    const fs = s.getFieldState('profile.name');
    expect(fs.error).toBe('bad');
    expect(fs.errors).toEqual(['bad', 'worse']);
    expect(fs.isDirty).toBe(true);
    expect(fs.isTouched).toBe(true);
  });
});

describe('store derived state', () => {
  it('isValid is true with no errors, false otherwise', () => {
    const s = make();
    expect(s.getState().isValid).toBe(true);
    s.setError('profile.name', ['x']);
    expect(s.getState().isValid).toBe(false);
  });

  it('isValid ignores empty message arrays', () => {
    const s = make();
    s.setError('profile.name', []);
    expect(s.getState().isValid).toBe(true);
  });

  it('isDirty tracks any changed field', () => {
    const s = make();
    expect(s.getState().isDirty).toBe(false);
    s.setValue('profile.name', 'Ada');
    expect(s.getState().isDirty).toBe(true);
  });

  it('dirtyFields and touchedFields mirror dirty and touched', () => {
    const s = make();
    s.setValue('profile.age', 5);
    s.setTouched('profile.age', true);
    const st = s.getState();
    expect(st.dirtyFields['profile.age']).toBe(true);
    expect(st.touchedFields['profile.age']).toBe(true);
  });

  it('submitCount increments', () => {
    const s = make();
    expect(s.getState().submitCount).toBe(0);
    s.incrementSubmitCount();
    s.incrementSubmitCount();
    expect(s.getState().submitCount).toBe(2);
  });
});

describe('store resetField', () => {
  it('restores the initial value and clears the field error/touched', () => {
    const s = make();
    s.setValue('profile.name', 'Ada');
    s.setTouched('profile.name', true);
    s.setError('profile.name', ['bad']);
    s.resetField('profile.name');
    expect(s.getValue('profile.name')).toBe('');
    const { errors, touched } = s.getState();
    expect(errors['profile.name']).toBeUndefined();
    expect(touched['profile.name']).toBeUndefined();
  });

  it('leaves sibling fields untouched', () => {
    const s = make();
    s.setValue('profile.name', 'Ada');
    s.setValue('profile.age', 9);
    s.resetField('profile.name');
    expect(s.getValue('profile.age')).toBe(9);
  });
});

describe('store subscribeAll', () => {
  it('fires on setValue, setError, setTouched, reset', () => {
    const s = make();
    const spy = vi.fn();
    s.subscribeAll(spy);
    s.setValue('profile.name', 'a');
    s.setError('profile.name', ['e']);
    s.setTouched('profile.name', true);
    s.reset();
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it('stops firing after unsubscribe', () => {
    const s = make();
    const spy = vi.fn();
    const off = s.subscribeAll(spy);
    off();
    s.setValue('profile.name', 'a');
    expect(spy).not.toHaveBeenCalled();
  });
});
