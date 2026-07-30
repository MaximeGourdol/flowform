export type Path<T> = PathImpl<T> | (string & {});

type PathImpl<T> = T extends readonly (infer U)[]
  ? `${number}` | `${number}.${PathImpl<U>}`
  : T extends object
    ? {
        [K in keyof T & (string | number)]:
          | `${K}`
          | (PathValue<T, `${K}`> extends object
              ? `${K}.${PathImpl<PathValue<T, `${K}`>>}`
              : never);
      }[keyof T & (string | number)]
    : never;

export type PathValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : T extends readonly (infer U)[]
      ? PathValue<U, Rest>
      : unknown
  : P extends keyof T
    ? T[P]
    : T extends readonly (infer U)[]
      ? U
      : unknown;

export type ErrorMap = Readonly<Record<string, readonly string[]>>;

export interface ValidationContext {
  readonly currentStepId?: string;
  readonly trigger?: 'change' | 'blur' | 'submit' | 'step';
}

export type Validator<TValues> = (
  values: TValues,
  context?: ValidationContext,
) => Promise<ErrorMap> | ErrorMap;

export type Unsubscribe = () => void;
