import { describe, expectTypeOf, it } from 'vitest';
import { createFormHooks } from './create-form-hooks.js';
import type { FieldApi, FieldRegistration } from './use-field.js';

interface Values {
  account: { email: string; age: number };
  agree: boolean;
}

const hooks = createFormHooks<Values>();

describe('createFormHooks typing', () => {
  it('infers the value type at a nested path', () => {
    const field = hooks.useField('account.email');
    expectTypeOf(field).toEqualTypeOf<FieldApi<string>>();
    expectTypeOf(field.value).toEqualTypeOf<string>();
  });

  it('infers a numeric leaf', () => {
    const field = hooks.useField('account.age');
    expectTypeOf(field.value).toEqualTypeOf<number>();
  });

  it('infers a boolean leaf', () => {
    expectTypeOf(hooks.useField('agree').value).toEqualTypeOf<boolean>();
  });

  it('register returns a DOM-spreadable registration', () => {
    const reg = hooks.useField('account.email').register();
    expectTypeOf(reg).toEqualTypeOf<FieldRegistration>();
    expectTypeOf(reg.value).toEqualTypeOf<string>();
    expectTypeOf(reg.name).toEqualTypeOf<string>();
  });

  it('exposes error and touched', () => {
    const field = hooks.useField('account.email');
    expectTypeOf(field.error).toEqualTypeOf<string | undefined>();
    expectTypeOf(field.touched).toEqualTypeOf<boolean>();
  });
});
