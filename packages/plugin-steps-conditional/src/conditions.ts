import type { Path } from '@formjourney/core';

export interface EqualsCondition<TValues> {
  readonly field: Path<TValues>;
  readonly equals: unknown;
}

export interface FilledCondition<TValues> {
  readonly field: Path<TValues>;
  readonly filled: true;
}

export type Condition<TValues> =
  EqualsCondition<TValues> | FilledCondition<TValues>;

const readField = (values: unknown, field: string): unknown => {
  let cursor: unknown = values;
  for (const segment of field.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const isFilled = (value: unknown): boolean => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === false
  ) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

const matchesEquals = (value: unknown, expected: unknown): boolean => {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  }
  return value === expected;
};

export const evaluateCondition = <TValues>(
  condition: Condition<TValues>,
  values: TValues,
): boolean => {
  const value = readField(values, condition.field);
  if ('filled' in condition) {
    return isFilled(value);
  }
  return matchesEquals(value, condition.equals);
};
