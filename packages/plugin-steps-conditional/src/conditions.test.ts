import { describe, expect, it } from 'vitest';
import { evaluateCondition, type Condition } from './conditions.js';

interface Values {
  country: string;
  age: number;
  newsletter: boolean;
  tags: readonly string[];
  note: string | undefined;
}

const base: Values = {
  country: '',
  age: 0,
  newsletter: false,
  tags: [],
  note: undefined,
};

describe('evaluateCondition — equals', () => {
  it('is true when the field equals a single value', () => {
    const condition: Condition<Values> = { field: 'country', equals: 'FR' };
    expect(evaluateCondition(condition, { ...base, country: 'FR' })).toBe(true);
  });

  it('is false when the field differs from a single value', () => {
    const condition: Condition<Values> = { field: 'country', equals: 'FR' };
    expect(evaluateCondition(condition, { ...base, country: 'BE' })).toBe(
      false,
    );
  });

  it('is true when the field is included in an array of values', () => {
    const condition: Condition<Values> = {
      field: 'country',
      equals: ['FR', 'BE'],
    };
    expect(evaluateCondition(condition, { ...base, country: 'BE' })).toBe(true);
  });

  it('is false when the field is not included in an array of values', () => {
    const condition: Condition<Values> = {
      field: 'country',
      equals: ['FR', 'BE'],
    };
    expect(evaluateCondition(condition, { ...base, country: 'US' })).toBe(
      false,
    );
  });

  it('matches non-string values with strict equality', () => {
    const condition: Condition<Values> = { field: 'age', equals: 18 };
    expect(evaluateCondition(condition, { ...base, age: 18 })).toBe(true);
    expect(evaluateCondition(condition, { ...base, age: 21 })).toBe(false);
  });
});

describe('evaluateCondition — filled', () => {
  it('is true when a string field is non-empty', () => {
    const condition: Condition<Values> = { field: 'country', filled: true };
    expect(evaluateCondition(condition, { ...base, country: 'FR' })).toBe(true);
  });

  it('is false when a string field is empty', () => {
    const condition: Condition<Values> = { field: 'country', filled: true };
    expect(evaluateCondition(condition, { ...base, country: '' })).toBe(false);
  });

  it('is false when the field is undefined', () => {
    const condition: Condition<Values> = { field: 'note', filled: true };
    expect(evaluateCondition(condition, { ...base, note: undefined })).toBe(
      false,
    );
  });

  it('is false when an array field is empty', () => {
    const condition: Condition<Values> = { field: 'tags', filled: true };
    expect(evaluateCondition(condition, { ...base, tags: [] })).toBe(false);
  });

  it('is true when an array field has items', () => {
    const condition: Condition<Values> = { field: 'tags', filled: true };
    expect(evaluateCondition(condition, { ...base, tags: ['a'] })).toBe(true);
  });

  it('treats a false boolean as not filled (unchecked toggle)', () => {
    const condition: Condition<Values> = { field: 'newsletter', filled: true };
    expect(evaluateCondition(condition, { ...base, newsletter: false })).toBe(
      false,
    );
  });

  it('treats a true boolean as filled', () => {
    const condition: Condition<Values> = { field: 'newsletter', filled: true };
    expect(evaluateCondition(condition, { ...base, newsletter: true })).toBe(
      true,
    );
  });
});
