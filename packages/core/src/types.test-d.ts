import { describe, expectTypeOf, it } from 'vitest';
import type {
  ErrorMap,
  Path,
  PathValue,
  ValidationContext,
  Validator,
} from './types.js';

interface Sample {
  user: {
    name: string;
    age: number;
    tags: string[];
  };
  active: boolean;
}

describe('Path<T>', () => {
  it('accepts top-level and nested literal paths', () => {
    expectTypeOf<'user'>().toExtend<Path<Sample>>();
    expectTypeOf<'user.name'>().toExtend<Path<Sample>>();
    expectTypeOf<'user.tags'>().toExtend<Path<Sample>>();
    expectTypeOf<'active'>().toExtend<Path<Sample>>();
  });

  it('accepts array index paths', () => {
    expectTypeOf<'user.tags.0'>().toExtend<Path<Sample>>();
  });

  it('still accepts arbitrary strings (runtime-computed paths)', () => {
    expectTypeOf<string>().toExtend<Path<Sample>>();
  });
});

describe('PathValue<T, P>', () => {
  it('resolves top-level value types', () => {
    expectTypeOf<PathValue<Sample, 'active'>>().toEqualTypeOf<boolean>();
  });

  it('resolves nested value types', () => {
    expectTypeOf<PathValue<Sample, 'user.name'>>().toEqualTypeOf<string>();
    expectTypeOf<PathValue<Sample, 'user.age'>>().toEqualTypeOf<number>();
  });

  it('resolves array element types via index', () => {
    expectTypeOf<PathValue<Sample, 'user.tags.0'>>().toEqualTypeOf<string>();
  });

  it('resolves the whole object for an object path', () => {
    expectTypeOf<PathValue<Sample, 'user'>>().toEqualTypeOf<Sample['user']>();
  });
});

describe('ErrorMap', () => {
  it('is a readonly record of readonly string arrays', () => {
    const errors: ErrorMap = { 'user.name': ['required'] };
    expectTypeOf(errors).toExtend<
      Readonly<Record<string, readonly string[]>>
    >();
  });
});

describe('Validator<TValues>', () => {
  it('accepts a sync validator returning an ErrorMap', () => {
    const v: Validator<Sample> = () => ({});
    expectTypeOf(v).toBeFunction();
    expectTypeOf(v).parameter(0).toEqualTypeOf<Sample>();
    expectTypeOf(v).parameter(1).toEqualTypeOf<ValidationContext | undefined>();
  });

  it('accepts an async validator returning a Promise<ErrorMap>', () => {
    const v: Validator<Sample> = () => Promise.resolve({});
    expectTypeOf(v).returns.toEqualTypeOf<Promise<ErrorMap> | ErrorMap>();
  });
});
