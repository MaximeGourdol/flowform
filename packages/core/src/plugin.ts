import type { FormCore } from './create-form.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FormPluginRegistry {}

export interface Plugin<TApi = unknown> {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly install: (core: FormCore<any>, options?: unknown) => TApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly uninstall?: (core: FormCore<any>) => void;
}
