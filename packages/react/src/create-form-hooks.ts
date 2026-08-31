import type { Path, PathValue } from '@formjourney/core';
import { useControl, type ControlApi } from './use-control.js';
import { useField, type FieldApi } from './use-field.js';
import {
  useFieldList,
  type FieldListApi,
  type ItemOf,
} from './use-field-list.js';
import { useForm, type FormApi } from './use-form.js';
import { useObserve } from './use-observe.js';
import { useStep, type StepApi } from './use-step.js';

export interface FormHooks<TValues> {
  readonly useField: <P extends Path<TValues>>(
    path: P,
  ) => FieldApi<PathValue<TValues, P & string>>;
  readonly useControl: <P extends Path<TValues>>(
    path: P,
  ) => ControlApi<PathValue<TValues, P & string>>;
  readonly useFieldList: <P extends Path<TValues>>(
    path: P,
  ) => FieldListApi<ItemOf<TValues, P>>;
  readonly useObserve: {
    (): TValues;
    <P extends Path<TValues>>(path: P): PathValue<TValues, P & string>;
  };
  readonly useStep: () => StepApi;
  readonly useForm: () => FormApi<TValues>;
}

export const createFormHooks = <TValues>(): FormHooks<TValues> => ({
  useField: <P extends Path<TValues>>(path: P) => useField<TValues, P>(path),
  useControl: <P extends Path<TValues>>(path: P) =>
    useControl<TValues, P>(path),
  useFieldList: <P extends Path<TValues>>(path: P) =>
    useFieldList<TValues, P>(path),
  useObserve: (<P extends Path<TValues>>(path?: P) =>
    path === undefined
      ? useObserve<TValues>()
      : useObserve<TValues, P>(path)) as FormHooks<TValues>['useObserve'],
  useStep: () => useStep(),
  useForm: () => useForm<TValues>(),
});
