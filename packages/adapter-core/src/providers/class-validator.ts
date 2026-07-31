import type { ErrorMap } from '@flowform/core';
import type { ClassConstructor } from '../types.js';
import { addIssue, type MutableErrorMap } from '../error-map.js';

interface ClassValidationError {
  readonly property: string;
  readonly constraints?: Record<string, string>;
  readonly children?: readonly ClassValidationError[];
}

interface ClassValidatorModule {
  readonly validate: (
    object: object,
    options?: unknown,
  ) => Promise<readonly ClassValidationError[]>;
}

export const isClassConstructor = (
  schema: unknown,
): schema is ClassConstructor =>
  typeof schema === 'function' &&
  typeof schema.prototype === 'object' &&
  schema.prototype !== null;

const collect = (
  errors: readonly ClassValidationError[],
  prefix: string,
  map: MutableErrorMap,
): void => {
  for (const error of errors) {
    const key = prefix === '' ? error.property : `${prefix}.${error.property}`;
    if (error.constraints !== undefined) {
      for (const message of Object.values(error.constraints)) {
        addIssue(map, key, message);
      }
    }
    if (error.children !== undefined && error.children.length > 0) {
      collect(error.children, key, map);
    }
  }
};

export const runClassValidator = async (
  ctor: ClassConstructor,
  values: unknown,
): Promise<ErrorMap> => {
  const mod =
    (await import('class-validator')) as unknown as ClassValidatorModule;
  const instance = Object.assign(new ctor(), values as object);
  const errors = await mod.validate(instance, { whitelist: false });
  const map: MutableErrorMap = {};
  collect(errors, '', map);
  return map;
};
