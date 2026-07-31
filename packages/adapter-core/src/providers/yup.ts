import type { ErrorMap } from '@flowform/core';
import type { YupLikeSchema } from '../types.js';
import { addIssue, type MutableErrorMap } from '../error-map.js';

interface YupInnerError {
  readonly path?: string;
  readonly message: string;
}

interface YupValidationError {
  readonly inner: readonly YupInnerError[];
  readonly path?: string;
  readonly message: string;
}

export const isYupSchema = (schema: unknown): schema is YupLikeSchema => {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }
  const record = schema as Record<string, unknown>;
  return (
    record.__isYupSchema__ === true && typeof record.validate === 'function'
  );
};

const isValidationError = (error: unknown): error is YupValidationError =>
  typeof error === 'object' &&
  error !== null &&
  Array.isArray((error as Record<string, unknown>).inner);

export const runYupSchema = async (
  schema: YupLikeSchema,
  values: unknown,
  abortEarly: boolean,
): Promise<ErrorMap> => {
  try {
    await schema.validate(values, { abortEarly });
    return {};
  } catch (error) {
    if (!isValidationError(error)) {
      throw error;
    }
    const map: MutableErrorMap = {};
    const issues = error.inner.length > 0 ? error.inner : [error];
    for (const issue of issues) {
      addIssue(map, issue.path ?? '', issue.message);
    }
    return map;
  }
};
