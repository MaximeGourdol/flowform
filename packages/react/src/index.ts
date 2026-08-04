import type { FormCore } from '@flowform/core';

export type {
  ErrorMap,
  FormCore,
  FormState,
  Path,
  PathValue,
  Validator,
} from '@flowform/core';

export { FormProvider, type FormProviderProps } from './provider.js';
export {
  useFormContext,
  type FormContextValue,
  type ValidationMode,
  type ReValidationMode,
  type FieldTrigger,
} from './context.js';
export {
  useField,
  type FieldApi,
  type FieldRegistration,
  type RegisterOptions,
} from './use-field.js';
export { useStep, type StepApi } from './use-step.js';
export { useDevtools } from './use-devtools.js';
export { useForm, type FormApi, type SubmitHandler } from './use-form.js';
export { createFormHooks, type FormHooks } from './create-form-hooks.js';

export type { SyncStore } from './sync-store.js';

export type ReactFormInstance<TValues> = FormCore<TValues>;
