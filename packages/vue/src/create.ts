import {
  createForm,
  type CreateFormOptions,
  type FormCore,
} from '@formjourney/core';
import {
  createContext,
  provideForm,
  type CreateContextOptions,
  type FormJourneyContext,
} from './context.js';

export type CreateVueFormOptions<TValues> = CreateFormOptions<TValues> &
  CreateContextOptions;

export const createVueForm = <TValues>(
  options: CreateVueFormOptions<TValues> | (() => FormCore<TValues>),
  contextOptions?: CreateContextOptions,
): FormJourneyContext<TValues> => {
  if (typeof options === 'function') {
    return createContext(options(), contextOptions);
  }
  const { mode, reValidateMode, ...formOptions } = options;
  return createContext(createForm(formOptions), {
    ...(mode === undefined ? {} : { mode }),
    ...(reValidateMode === undefined ? {} : { reValidateMode }),
  });
};

export const provideFormJourney = <TValues>(
  options: CreateVueFormOptions<TValues> | (() => FormCore<TValues>),
  contextOptions?: CreateContextOptions,
): FormJourneyContext<TValues> => {
  const context = createVueForm(options, contextOptions);
  provideForm(context);
  return context;
};
