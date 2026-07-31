import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as yup from 'yup';
import { toValidator } from './to-validator.js';

describe('toValidator — Zod (standard schema)', () => {
  const schema = z.object({
    user: z.object({
      email: z.string().email('Invalid email'),
      name: z.string().min(2, 'Too short'),
    }),
    items: z.array(z.object({ qty: z.number().min(1, 'Min 1') })),
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'a@b.co', name: 'Ada' },
      items: [{ qty: 2 }],
    });
    expect(result).toEqual({});
  });

  it('maps nested field errors to dot-notation keys', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'nope', name: 'A' },
      items: [{ qty: 2 }],
    });
    expect(result['user.email']).toEqual(['Invalid email']);
    expect(result['user.name']).toEqual(['Too short']);
  });

  it('maps array element errors with index notation', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'a@b.co', name: 'Ada' },
      items: [{ qty: 0 }],
    });
    expect(result['items.0.qty']).toEqual(['Min 1']);
  });

  it('validates synchronously when the schema is sync', () => {
    const sync = z.object({ name: z.string().min(2, 'Too short') });
    const validate = toValidator(sync);
    const result = validate({ name: 'A' });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual({ name: ['Too short'] });
  });

  it('preserves custom error messages', async () => {
    const custom = z.object({
      code: z.string().min(4, 'CODE_TOO_SHORT'),
    });
    const validate = toValidator(custom);
    const result = await validate({ code: 'ab' });
    expect(result.code).toEqual(['CODE_TOO_SHORT']);
  });
});

describe('toValidator — Yup', () => {
  const schema = yup.object({
    user: yup.object({
      email: yup.string().email('Invalid email').required('Required'),
      name: yup.string().min(2, 'Too short').required('Required'),
    }),
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'a@b.co', name: 'Ada' },
    });
    expect(result).toEqual({});
  });

  it('maps nested field errors to dot-notation keys', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'nope', name: 'A' },
    });
    expect(result['user.email']).toEqual(['Invalid email']);
    expect(result['user.name']).toEqual(['Too short']);
  });

  it('returns a Promise (Yup validate is async)', () => {
    const validate = toValidator(schema);
    const result = validate({ user: { email: 'nope', name: 'A' } });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('toValidator — partial validation (paths)', () => {
  const schema = z.object({
    user: z.object({
      email: z.string().email('Invalid email'),
      name: z.string().min(2, 'Too short'),
    }),
    shipping: z.object({ zip: z.string().min(5, 'Bad zip') }),
  });

  it('keeps only the errors under the requested paths', async () => {
    const validate = toValidator(schema, { paths: ['user'] });
    const result = await validate({
      user: { email: 'nope', name: 'A' },
      shipping: { zip: '1' },
    });
    expect(result['user.email']).toEqual(['Invalid email']);
    expect(result['user.name']).toEqual(['Too short']);
    expect(result['shipping.zip']).toBeUndefined();
  });

  it('scopes to a single leaf path', async () => {
    const validate = toValidator(schema, { paths: ['user.email'] });
    const result = await validate({
      user: { email: 'nope', name: 'A' },
      shipping: { zip: '1' },
    });
    expect(Object.keys(result)).toEqual(['user.email']);
  });
});

describe('toValidator — unknown schema', () => {
  it('throws for a value that is not a recognized schema', () => {
    expect(() => toValidator({ not: 'a schema' } as never)).toThrow();
  });
});
