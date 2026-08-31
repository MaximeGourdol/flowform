import type { ErrorMap, Path, TriggerTarget } from '@formjourney/core';
import { computed, type ComputedRef } from 'vue';
import { useFormJourneyContext } from './context.js';

export type SubmitHandler<TValues> = (values: TValues) => void | Promise<void>;

export interface FormApi<TValues> {
  readonly values: ComputedRef<TValues>;
  readonly errors: ComputedRef<ErrorMap>;
  readonly isValid: ComputedRef<boolean>;
  readonly isDirty: ComputedRef<boolean>;
  readonly isSubmitting: ComputedRef<boolean>;
  readonly submitCount: ComputedRef<number>;
  readonly reset: (partial?: Partial<TValues>) => void;
  readonly resetField: (path: Path<TValues>) => void;
  readonly trigger: (target?: TriggerTarget<TValues>) => Promise<boolean>;
  readonly submit: (onValid?: SubmitHandler<TValues>) => Promise<boolean>;
}

export const useForm = <TValues>(): FormApi<TValues> => {
  const ctx = useFormJourneyContext<TValues>();

  const reset = (partial?: Partial<TValues>): void => {
    ctx.core.store.reset(partial);
    ctx.refresh();
  };

  const resetField = (path: Path<TValues>): void => {
    ctx.core.store.resetField(path);
    ctx.refresh();
  };

  const trigger = async (target?: TriggerTarget<TValues>): Promise<boolean> => {
    const ok = await ctx.core.steps.trigger(target);
    ctx.refresh();
    return ok;
  };

  const submit = async (onValid?: SubmitHandler<TValues>): Promise<boolean> => {
    const result = await ctx.core.submit(onValid);
    ctx.refresh();
    return result.ok;
  };

  return {
    values: computed(() => ctx.state.value.values),
    errors: computed(() => ctx.state.value.errors),
    isValid: computed(() => ctx.state.value.isValid),
    isDirty: computed(() => ctx.state.value.isDirty),
    isSubmitting: computed(() => ctx.state.value.isSubmitting),
    submitCount: computed(() => ctx.state.value.submitCount),
    reset,
    resetField,
    trigger,
    submit,
  };
};
