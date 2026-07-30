import { describe, expectTypeOf, it } from 'vitest';
import { createStore } from './store.js';

interface Values {
  user: { name: string; tags: string[] };
  agree: boolean;
}

const store = createStore<Values>({
  user: { name: '', tags: [] },
  agree: false,
});

describe('getValue typing', () => {
  it('infers the exact value type from the path', () => {
    expectTypeOf(store.getValue('user.name')).toEqualTypeOf<string>();
    expectTypeOf(store.getValue('agree')).toEqualTypeOf<boolean>();
    expectTypeOf(store.getValue('user.tags.0')).toEqualTypeOf<string>();
  });
});

describe('setValue typing', () => {
  it('accepts a value of the matching type', () => {
    store.setValue('user.name', 'ok');
    store.setValue('agree', true);
  });

  it('rejects a value of the wrong type', () => {
    // @ts-expect-error - number is not assignable to string
    store.setValue('user.name', 123);
    // @ts-expect-error - string is not assignable to boolean
    store.setValue('agree', 'nope');
  });
});

describe('subscribe typing', () => {
  it('infers the listener value type from the path', () => {
    store.subscribe('user.name', (value) => {
      expectTypeOf(value).toEqualTypeOf<string>();
    });
  });
});
