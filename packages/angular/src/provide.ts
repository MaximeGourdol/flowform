import {
  createForm,
  type CreateFormOptions,
  type FormCore,
} from '@flowform/core';
import type { Provider } from '@angular/core';
import { FlowFormService } from './flow-form.service';
import {
  FLOW_FORM,
  FLOW_FORM_MODE,
  type ReValidationMode,
  type ValidationMode,
} from './tokens';

export interface ProvideFlowFormOptions {
  readonly mode?: ValidationMode;
  readonly reValidateMode?: ReValidationMode;
}

export const provideFlowForm = <TValues>(
  form: CreateFormOptions<TValues> | (() => FormCore<TValues>),
  options?: ProvideFlowFormOptions,
): Provider[] => [
  {
    provide: FLOW_FORM,
    useFactory: (): FormCore<TValues> =>
      typeof form === 'function' ? form() : createForm(form),
  },
  {
    provide: FLOW_FORM_MODE,
    useValue: {
      mode: options?.mode ?? 'onSubmit',
      reValidateMode: options?.reValidateMode ?? 'onChange',
    },
  },
  FlowFormService,
];
