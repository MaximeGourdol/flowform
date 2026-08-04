import { describe, expect, it, vi } from 'vitest';
import { createStore, type FormStore } from './store.js';

interface Item {
  name: string;
}
interface Values {
  items: Item[];
}

const make = (items: Item[] = []): FormStore<Values> =>
  createStore<Values>({ items });

describe('store array helpers — values', () => {
  it('arrayAppend adds at the end', () => {
    const s = make([{ name: 'a' }]);
    s.arrayAppend('items', { name: 'b' });
    expect(s.getState().values.items).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('arrayPrepend adds at the start', () => {
    const s = make([{ name: 'a' }]);
    s.arrayPrepend('items', { name: 'z' });
    expect(s.getState().values.items).toEqual([{ name: 'z' }, { name: 'a' }]);
  });

  it('arrayInsert inserts at an index', () => {
    const s = make([{ name: 'a' }, { name: 'c' }]);
    s.arrayInsert('items', 1, { name: 'b' });
    expect(s.getState().values.items.map((i) => i.name)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('arrayRemove removes at an index', () => {
    const s = make([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    s.arrayRemove('items', 1);
    expect(s.getState().values.items.map((i) => i.name)).toEqual(['a', 'c']);
  });

  it('arrayMove reorders from -> to', () => {
    const s = make([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    s.arrayMove('items', 0, 2);
    expect(s.getState().values.items.map((i) => i.name)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('arraySwap swaps two indices', () => {
    const s = make([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    s.arraySwap('items', 0, 2);
    expect(s.getState().values.items.map((i) => i.name)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('arrayReplace replaces the whole array', () => {
    const s = make([{ name: 'a' }]);
    s.arrayReplace('items', [{ name: 'x' }, { name: 'y' }]);
    expect(s.getState().values.items.map((i) => i.name)).toEqual(['x', 'y']);
  });

  it('creates the array when the path is empty/undefined', () => {
    const s = createStore<{ items?: Item[] }>({});
    s.arrayAppend('items', { name: 'a' });
    expect(s.getState().values.items).toEqual([{ name: 'a' }]);
  });
});

describe('store array helpers — error/touched reindexing', () => {
  it('arrayRemove shifts errors of following items down', () => {
    const s = make([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    s.setError('items.0.name', ['e0']);
    s.setError('items.2.name', ['e2']);
    s.arrayRemove('items', 0);
    const { errors } = s.getState();
    expect(errors['items.0.name']).toEqual(undefined);
    expect(errors['items.1.name']).toEqual(['e2']);
  });

  it('arrayRemove drops errors of the removed item', () => {
    const s = make([{ name: 'a' }, { name: 'b' }]);
    s.setError('items.0.name', ['gone']);
    s.setError('items.1.name', ['kept']);
    s.arrayRemove('items', 0);
    const { errors } = s.getState();
    expect(errors['items.0.name']).toEqual(['kept']);
    expect(Object.keys(errors)).toHaveLength(1);
  });

  it('arrayInsert shifts errors of items at/after the index up', () => {
    const s = make([{ name: 'a' }, { name: 'b' }]);
    s.setError('items.1.name', ['b-err']);
    s.arrayInsert('items', 1, { name: 'x' });
    const { errors } = s.getState();
    expect(errors['items.1.name']).toEqual(undefined);
    expect(errors['items.2.name']).toEqual(['b-err']);
  });

  it('arrayMove moves the error with its item', () => {
    const s = make([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    s.setError('items.0.name', ['a-err']);
    s.arrayMove('items', 0, 2);
    const { errors } = s.getState();
    expect(errors['items.2.name']).toEqual(['a-err']);
    expect(errors['items.0.name']).toEqual(undefined);
  });

  it('arraySwap swaps errors of the two items', () => {
    const s = make([{ name: 'a' }, { name: 'b' }]);
    s.setError('items.0.name', ['a-err']);
    s.setError('items.1.name', ['b-err']);
    s.arraySwap('items', 0, 1);
    const { errors } = s.getState();
    expect(errors['items.0.name']).toEqual(['b-err']);
    expect(errors['items.1.name']).toEqual(['a-err']);
  });

  it('reindexes touched the same way as errors on remove', () => {
    const s = make([{ name: 'a' }, { name: 'b' }]);
    s.setTouched('items.1.name', true);
    s.arrayRemove('items', 0);
    const { touched } = s.getState();
    expect(touched['items.0.name']).toBe(true);
    expect(touched['items.1.name']).toBe(undefined);
  });
});

describe('store array helpers — notifications', () => {
  it('array ops fire subscribeAll', () => {
    const s = make([{ name: 'a' }]);
    const spy = vi.fn();
    s.subscribeAll(spy);
    s.arrayAppend('items', { name: 'b' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
