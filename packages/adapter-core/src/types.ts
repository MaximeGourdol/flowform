import type { ErrorMap, ValidationContext } from '@flowform/core';

export interface StandardPathSegment {
  readonly key: PropertyKey;
}

export interface StandardIssue {
  readonly message: string;
  readonly path?: readonly (PropertyKey | StandardPathSegment)[] | undefined;
}

export interface StandardResult<Output> {
  readonly value?: Output;
  readonly issues?: readonly StandardIssue[] | undefined;
}

export interface StandardSchemaV1<Output = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardResult<Output> | Promise<StandardResult<Output>>;
    readonly types?: { readonly output: Output } | undefined;
  };
}

export interface YupLikeSchema<Output = unknown> {
  readonly __isYupSchema__: true;
  readonly validate: (value: unknown, options?: unknown) => Promise<Output>;
  readonly validateSync: (value: unknown, options?: unknown) => Output;
}

export interface JoiLikeSchema {
  readonly $_root: unknown;
  readonly validate: (
    value: unknown,
    options?: unknown,
  ) => { readonly error?: unknown; readonly value: unknown };
}

export interface AjvValidateFunction {
  (value: unknown): boolean;
  errors?: readonly AjvErrorObject[] | null;
  readonly schema?: unknown;
}

export interface AjvErrorObject {
  readonly instancePath: string;
  readonly message?: string;
  readonly keyword: string;
  readonly params: Record<string, unknown>;
}

export type ClassConstructor = new (...args: never[]) => object;

export type AnySchema =
  | StandardSchemaV1
  | YupLikeSchema
  | JoiLikeSchema
  | AjvValidateFunction
  | ClassConstructor;

export type InferValues<TSchema> =
  TSchema extends StandardSchemaV1<infer Output>
    ? Output
    : TSchema extends YupLikeSchema<infer Output>
      ? Output
      : unknown;

export interface ToValidatorOptions {
  readonly paths?: readonly string[];
  readonly abortEarly?: boolean;
}

export type { ErrorMap, ValidationContext };
