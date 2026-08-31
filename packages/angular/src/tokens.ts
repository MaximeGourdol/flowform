import type { FormCore } from '@formjourney/core';
import { InjectionToken } from '@angular/core';

export const FORM_JOURNEY = new InjectionToken<FormCore<unknown>>(
  'FORM_JOURNEY',
);

export type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur';
export type ReValidationMode = 'onChange' | 'onBlur' | 'onSubmit';
export type FieldTrigger = 'change' | 'blur';

export interface FormJourneyMode {
  readonly mode: ValidationMode;
  readonly reValidateMode: ReValidationMode;
}

export const FORM_JOURNEY_MODE = new InjectionToken<FormJourneyMode>(
  'FORM_JOURNEY_MODE',
);
