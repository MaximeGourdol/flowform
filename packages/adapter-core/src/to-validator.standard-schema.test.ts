import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import { toValidator } from './to-validator.js';

describe('toValidator — Zod (Standard Schema)', () => {
  const schema = z.object({
    user: z.object({
      email: z.string().email('Invalid email'),
      name: z.string().min(2, 'Too short'),
    }),
    tags: z.array(z.object({ label: z.string().min(1, 'Empty') })),
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'a@b.co', name: 'Ada' },
      tags: [{ label: 'x' }],
    });
    expect(result).toEqual({});
  });

  it('maps nested field errors to dot-notation keys', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'nope', name: 'A' },
      tags: [{ label: 'x' }],
    });
    expect(result['user.email']).toEqual(['Invalid email']);
    expect(result['user.name']).toEqual(['Too short']);
  });

  it('maps array index errors to numeric segments', async () => {
    const validate = toValidator(schema);
    const result = await validate({
      user: { email: 'a@b.co', name: 'Ada' },
      tags: [{ label: 'ok' }, { label: '' }],
    });
    expect(result['tags.1.label']).toEqual(['Empty']);
  });

  it('honors the paths option', async () => {
    const validate = toValidator(schema, { paths: ['user.email'] });
    const result = await validate({
      user: { email: 'nope', name: 'A' },
      tags: [],
    });
    expect(Object.keys(result)).toEqual(['user.email']);
  });
});

describe('toValidator — Valibot (Standard Schema)', () => {
  const schema = v.object({
    user: v.object({
      email: v.pipe(v.string(), v.email('Invalid email')),
      name: v.pipe(v.string(), v.minLength(2, 'Too short')),
    }),
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(schema);
    const result = await validate({ user: { email: 'a@b.co', name: 'Ada' } });
    expect(result).toEqual({});
  });

  it('maps nested field errors to dot-notation keys', async () => {
    const validate = toValidator(schema);
    const result = await validate({ user: { email: 'nope', name: 'A' } });
    expect(result['user.email']).toEqual(['Invalid email']);
    expect(result['user.name']).toEqual(['Too short']);
  });
});

describe('toValidator — ArkType (Standard Schema)', () => {
  const schema = type({
    user: {
      email: 'string.email',
      name: 'string >= 2',
    },
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(schema);
    const result = await validate({ user: { email: 'a@b.co', name: 'Ada' } });
    expect(result).toEqual({});
  });

  it('maps nested field errors to dot-notation keys', async () => {
    const validate = toValidator(schema);
    const result = await validate({ user: { email: 'nope', name: 'A' } });
    expect(Object.keys(result)).toContain('user.email');
    expect(Object.keys(result)).toContain('user.name');
  });
});
