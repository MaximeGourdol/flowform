import {
  createForm,
  type CreateFormOptions,
  type FormCore,
} from '@formjourney/core';
import type { Provider } from '@angular/core';
import { FormJourneyService } from './form-journey.service';
import {
  FORM_JOURNEY,
  FORM_JOURNEY_MODE,
  type ReValidationMode,
  type ValidationMode,
} from './tokens';

export interface ProvideFormJourneyOptions {
  readonly mode?: ValidationMode;
  readonly reValidateMode?: ReValidationMode;
}

export const provideFormJourney = <TValues>(
  form: CreateFormOptions<TValues> | (() => FormCore<TValues>),
  options?: ProvideFormJourneyOptions,
): Provider[] => [
  {
    provide: FORM_JOURNEY,
    useFactory: (): FormCore<TValues> =>
      typeof form === 'function' ? form() : createForm(form),
  },
  {
    provide: FORM_JOURNEY_MODE,
    useValue: {
      mode: options?.mode ?? 'onSubmit',
      reValidateMode: options?.reValidateMode ?? 'onChange',
    },
  },
  FormJourneyService,
];
