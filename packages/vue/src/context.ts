import type { FormCore, FormState } from '@formjourney/core';
import { inject, provide, shallowRef, type InjectionKey, type Ref } from 'vue';

export type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur';
export type ReValidationMode = 'onChange' | 'onBlur' | 'onSubmit';
export type FieldTrigger = 'change' | 'blur';

export interface FormJourneyContext<TValues> {
  readonly core: FormCore<TValues>;
  readonly state: Ref<FormState<TValues>>;
  readonly mode: ValidationMode;
  readonly reValidateMode: ReValidationMode;
  readonly refresh: () => void;
  readonly dispose: () => void;
}

const KEY: InjectionKey<FormJourneyContext<unknown>> = Symbol('formjourney');

export interface CreateContextOptions {
  readonly mode?: ValidationMode;
  readonly reValidateMode?: ReValidationMode;
}

export const createContext = <TValues>(
  core: FormCore<TValues>,
  options?: CreateContextOptions,
): FormJourneyContext<TValues> => {
  const state = shallowRef(core.store.getState());
  const refresh = (): void => {
    state.value = core.store.getState();
  };
  const offHandlers = [
    core.store.subscribeAll(refresh),
    core.bus.on('step:change', refresh),
    core.bus.on('validate:end', refresh),
    core.bus.on('submit:start', refresh),
    core.bus.on('submit:end', refresh),
  ];
  return {
    core,
    state,
    mode: options?.mode ?? 'onSubmit',
    reValidateMode: options?.reValidateMode ?? 'onChange',
    refresh,
    dispose: () => {
      for (const off of offHandlers) {
        off();
      }
    },
  };
};

export const provideForm = <TValues>(
  context: FormJourneyContext<TValues>,
): void => {
  provide(KEY, context as FormJourneyContext<unknown>);
};

export const useFormJourneyContext = <
  TValues,
>(): FormJourneyContext<TValues> => {
  const context = inject(KEY);
  if (context === undefined) {
    throw new Error(
      'useFormJourney* must be used under a component that called provideForm(createVueForm(...)).',
    );
  }
  return context as FormJourneyContext<TValues>;
};
