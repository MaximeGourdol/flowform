import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import * as yup from 'yup';
import type { ValidationContext, Validator } from '@formjourney/core';
import { toValidator } from './to-validator.js';

describe('toValidator inference', () => {
  it('infers TValues from a Zod schema (z.infer)', () => {
    const schema = z.object({
      user: z.object({ email: z.string() }),
      age: z.number(),
    });
    const validate = toValidator(schema);
    expectTypeOf(validate).toEqualTypeOf<
      Validator<{ user: { email: string }; age: number }>
    >();
  });

  it('infers TValues from a Yup schema (InferType)', () => {
    const schema = yup.object({
      name: yup.string().required(),
    });
    const validate = toValidator(schema);
    expectTypeOf(validate).parameter(0).toExtend<{ name: string }>();
  });

  it('accepts a ValidationContext as second argument', () => {
    const validate = toValidator(z.object({ a: z.string() }));
    expectTypeOf(validate)
      .parameter(1)
      .toEqualTypeOf<ValidationContext | undefined>();
  });
});
