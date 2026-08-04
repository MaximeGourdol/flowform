import type { FormCore } from '@flowform/core';
import { InjectionToken } from '@angular/core';

export const FLOW_FORM = new InjectionToken<FormCore<unknown>>('FLOW_FORM');

export type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur';
export type ReValidationMode = 'onChange' | 'onBlur' | 'onSubmit';
export type FieldTrigger = 'change' | 'blur';

export interface FlowFormMode {
  readonly mode: ValidationMode;
  readonly reValidateMode: ReValidationMode;
}

export const FLOW_FORM_MODE = new InjectionToken<FlowFormMode>(
  'FLOW_FORM_MODE',
);
