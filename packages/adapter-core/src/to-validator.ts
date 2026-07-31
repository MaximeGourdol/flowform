import type { ErrorMap, Validator } from '@flowform/core';
import type { AnySchema, InferValues, ToValidatorOptions } from './types.js';
import { filterByPaths } from './error-map.js';
import {
  isStandardSchema,
  runStandardSchema,
} from './providers/standard-schema.js';
import { isYupSchema, runYupSchema } from './providers/yup.js';
import { isJoiSchema, runJoiSchema } from './providers/joi.js';
import { isAjvValidateFunction, runAjvValidate } from './providers/ajv.js';
import {
  isClassConstructor,
  runClassValidator,
} from './providers/class-validator.js';

export function toValidator<TSchema extends AnySchema>(
  schema: TSchema,
  options?: ToValidatorOptions,
): Validator<InferValues<TSchema>>;
export function toValidator<TValues = unknown>(
  schema: unknown,
  options?: ToValidatorOptions,
): Validator<TValues>;
export function toValidator(
  schema: unknown,
  options?: ToValidatorOptions,
): Validator<unknown> {
  const paths = options?.paths;
  const abortEarly = options?.abortEarly ?? false;
  const scope = (map: ErrorMap): ErrorMap => filterByPaths(map, paths);

  if (isYupSchema(schema)) {
    return (values) => runYupSchema(schema, values, abortEarly).then(scope);
  }

  if (isJoiSchema(schema)) {
    return (values) => scope(runJoiSchema(schema, values, abortEarly));
  }

  if (isAjvValidateFunction(schema)) {
    return (values) => scope(runAjvValidate(schema, values));
  }

  if (isStandardSchema(schema)) {
    return (values) => {
      const result = runStandardSchema(schema, values);
      if (result instanceof Promise) {
        return result.then(scope);
      }
      return scope(result);
    };
  }

  if (isClassConstructor(schema)) {
    return (values) => runClassValidator(schema, values).then(scope);
  }

  throw new Error(
    'toValidator: unrecognized schema (expected Standard Schema, Yup, Joi, Ajv validate function, or a class-validator class)',
  );
}
