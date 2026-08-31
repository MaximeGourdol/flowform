import { describe, expectTypeOf, it } from 'vitest';
import type { ComputedRef, WritableComputedRef } from 'vue';
import { useField, type FieldApi } from './use-field.js';
import { useObserve } from './use-observe.js';
import { useFieldList, type FieldListApi } from './use-field-list.js';

interface Values {
  account: { email: string; age: number };
  agree: boolean;
  tags: { label: string }[];
}

describe('useField typing', () => {
  it('infers the value type at a nested path', () => {
    const field = useField<Values, 'account.email'>('account.email');
    expectTypeOf(field).toEqualTypeOf<FieldApi<string>>();
    expectTypeOf(field.model).toEqualTypeOf<WritableComputedRef<string>>();
    expectTypeOf(field.value).toEqualTypeOf<ComputedRef<string>>();
  });

  it('infers a numeric leaf', () => {
    const field = useField<Values, 'account.age'>('account.age');
    expectTypeOf(field.value).toEqualTypeOf<ComputedRef<number>>();
    expectTypeOf(field.setValue).parameter(0).toEqualTypeOf<number>();
  });

  it('infers a boolean leaf', () => {
    const field = useField<Values, 'agree'>('agree');
    expectTypeOf(field.model).toEqualTypeOf<WritableComputedRef<boolean>>();
  });

  it('exposes error and touched as computed refs', () => {
    const field = useField<Values, 'account.email'>('account.email');
    expectTypeOf(field.error).toEqualTypeOf<ComputedRef<string | undefined>>();
    expectTypeOf(field.errors).toEqualTypeOf<ComputedRef<readonly string[]>>();
    expectTypeOf(field.touched).toEqualTypeOf<ComputedRef<boolean>>();
  });
});

describe('useObserve typing', () => {
  it('returns the whole form with no path', () => {
    expectTypeOf(useObserve<Values>()).toEqualTypeOf<ComputedRef<Values>>();
  });

  it('returns the value type at a path', () => {
    expectTypeOf(
      useObserve<Values, 'account.email'>('account.email'),
    ).toEqualTypeOf<ComputedRef<string>>();
  });
});

describe('useFieldList typing', () => {
  it('infers the element type of an array path', () => {
    const list = useFieldList<Values, 'tags'>('tags');
    expectTypeOf(list).toEqualTypeOf<FieldListApi<{ label: string }>>();
    expectTypeOf(list.items).toEqualTypeOf<
      ComputedRef<readonly { label: string }[]>
    >();
    expectTypeOf(list.append).parameter(0).toEqualTypeOf<{ label: string }>();
  });
});
