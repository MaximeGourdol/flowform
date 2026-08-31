import { inject } from '@angular/core';
import { FormJourneyService } from './form-journey.service';

export const injectFormJourney = <TValues>(): FormJourneyService<TValues> =>
  inject(FormJourneyService) as FormJourneyService<TValues>;
