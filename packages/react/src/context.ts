import type { FormCore, Path, PathValue } from '@formjourney/core';
import { createContext, useContext } from 'react';
import type { SyncStore } from './sync-store.js';

export type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur';
export type ReValidationMode = 'onChange' | 'onBlur' | 'onSubmit';

export type FieldTrigger = 'change' | 'blur';

export interface FormContextValue<TValues> {
  readonly form: FormCore<TValues>;
  readonly sync: SyncStore<TValues>;
  readonly mode: ValidationMode;
  readonly reValidateMode: ReValidationMode;
  readonly setField: <P extends Path<TValues>>(
    path: P,
    value: PathValue<TValues, P & string>,
  ) => void;
  readonly touch: (path: Path<TValues>) => void;
  readonly revalidateField: (
    path: Path<TValues>,
    trigger: FieldTrigger,
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FormContext = createContext<FormContextValue<any> | null>(null);

export const useFormContext = <TValues>(): FormContextValue<TValues> => {
  const ctx = useContext(FormContext);
  if (ctx === null) {
    throw new Error(
      'useFormContext must be used within a <FormProvider>. Wrap your form tree with <FormProvider form={createForm(...)}>.',
    );
  }
  return ctx as FormContextValue<TValues>;
};
