import type { ErrorMap } from '@formjourney/core';
import type { StandardResult, StandardSchemaV1 } from '../types.js';
import { addIssue, normalizePath, type MutableErrorMap } from '../error-map.js';

export const isStandardSchema = (
  schema: unknown,
): schema is StandardSchemaV1 => {
  if (
    schema === null ||
    (typeof schema !== 'object' && typeof schema !== 'function')
  ) {
    return false;
  }
  const standard = (schema as Record<string, unknown>)['~standard'];
  return (
    typeof standard === 'object' &&
    standard !== null &&
    typeof (standard as Record<string, unknown>).validate === 'function'
  );
};

const toErrorMap = (result: StandardResult<unknown>): ErrorMap => {
  const map: MutableErrorMap = {};
  for (const issue of result.issues ?? []) {
    addIssue(map, normalizePath(issue.path ?? []), issue.message);
  }
  return map;
};

export const runStandardSchema = (
  schema: StandardSchemaV1,
  values: unknown,
): ErrorMap | Promise<ErrorMap> => {
  const result = schema['~standard'].validate(values);
  if (result instanceof Promise) {
    return result.then(toErrorMap);
  }
  return toErrorMap(result);
};
