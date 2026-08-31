import type { ErrorMap } from '@formjourney/core';
import type { JoiLikeSchema } from '../types.js';
import { addIssue, normalizePath, type MutableErrorMap } from '../error-map.js';

interface JoiDetail {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

interface JoiError {
  readonly details: readonly JoiDetail[];
}

export const isJoiSchema = (schema: unknown): schema is JoiLikeSchema => {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }
  const record = schema as Record<string, unknown>;
  return '$_root' in record && typeof record.validate === 'function';
};

const hasDetails = (error: unknown): error is JoiError =>
  typeof error === 'object' &&
  error !== null &&
  Array.isArray((error as Record<string, unknown>).details);

export const runJoiSchema = (
  schema: JoiLikeSchema,
  values: unknown,
  abortEarly: boolean,
): ErrorMap => {
  const outcome = schema.validate(values, { abortEarly });
  if (!hasDetails(outcome.error)) {
    return {};
  }
  const map: MutableErrorMap = {};
  for (const detail of outcome.error.details) {
    addIssue(map, normalizePath(detail.path), detail.message);
  }
  return map;
};
