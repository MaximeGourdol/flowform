import { inject } from '@angular/core';
import { FlowFormService } from './flow-form.service';

export const injectFlowForm = <TValues>(): FlowFormService<TValues> =>
  inject(FlowFormService) as FlowFormService<TValues>;
