import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import Joi from 'joi';
import Ajv from 'ajv';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { toValidator } from './to-validator.js';

describe('toValidator — Joi', () => {
  const schema = Joi.object({
    user: Joi.object({
      email: Joi.string().email({ tlds: false }).required().messages({
        'string.email': 'Invalid email',
        'any.required': 'Required',
      }),
      name: Joi.string().min(2).required().messages({
        'string.min': 'Too short',
        'any.required': 'Required',
      }),
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

  it('validates synchronously (Joi validate is sync)', () => {
    const validate = toValidator(schema);
    const result = validate({ user: { email: 'nope', name: 'A' } });
    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe('toValidator — Ajv (compiled validate function)', () => {
  const ajv = new Ajv({ allErrors: true });
  const validateFn = ajv.compile({
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          email: { type: 'string', minLength: 3 },
          name: { type: 'string', minLength: 2 },
        },
        required: ['email', 'name'],
      },
    },
    required: ['user'],
  });

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(validateFn);
    const result = await validate({ user: { email: 'a@b.co', name: 'Ada' } });
    expect(result).toEqual({});
  });

  it('maps instancePath to dot-notation keys', async () => {
    const validate = toValidator(validateFn);
    const result = await validate({ user: { email: 'a@b.co', name: 'A' } });
    expect(Object.keys(result)).toContain('user.name');
  });
});

describe('toValidator — class-validator', () => {
  class UserDto {
    @IsEmail({}, { message: 'Invalid email' })
    email!: string;

    @IsNotEmpty({ message: 'Required' })
    @MinLength(2, { message: 'Too short' })
    name!: string;
  }

  it('returns no errors for a valid value', async () => {
    const validate = toValidator(UserDto);
    const result = await validate({ email: 'a@b.co', name: 'Ada' });
    expect(result).toEqual({});
  });

  it('maps property names to error keys with provider messages', async () => {
    const validate = toValidator(UserDto);
    const result = await validate({ email: 'nope', name: 'A' });
    expect(result.email).toEqual(['Invalid email']);
    expect(result.name).toEqual(['Too short']);
  });

  it('returns a Promise (class-validator is async)', () => {
    const validate = toValidator(UserDto);
    const result = validate({ email: 'nope', name: 'A' });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('toValidator — detection isolation', () => {
  it('does not treat a Joi schema as Yup', async () => {
    const schema = Joi.object({
      a: Joi.string().required().messages({ 'any.required': 'Required' }),
    });
    const validate = toValidator(schema);
    const result = await validate({});
    expect(result.a).toEqual(['Required']);
  });
});
