import type { ErrorMap } from '@flowform/core';
import type { AjvValidateFunction } from '../types.js';
import { addIssue, type MutableErrorMap } from '../error-map.js';

export const isAjvValidateFunction = (
  schema: unknown,
): schema is AjvValidateFunction =>
  typeof schema === 'function' && 'schema' in schema && 'errors' in schema;

const instancePathToKey = (
  instancePath: string,
  keyword: string,
  params: Record<string, unknown>,
): string => {
  const base = instancePath
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .join('.');
  if (keyword === 'required' && typeof params.missingProperty === 'string') {
    return base === ''
      ? params.missingProperty
      : `${base}.${params.missingProperty}`;
  }
  return base;
};

export const runAjvValidate = (
  validate: AjvValidateFunction,
  values: unknown,
): ErrorMap => {
  const valid = validate(values);
  if (valid || validate.errors == null) {
    return {};
  }
  const map: MutableErrorMap = {};
  for (const error of validate.errors) {
    const key = instancePathToKey(
      error.instancePath,
      error.keyword,
      error.params,
    );
    addIssue(map, key, error.message ?? error.keyword);
  }
  return map;
};
