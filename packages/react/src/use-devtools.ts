import { useFormContext } from './context.js';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useDevtools = <TApi = unknown>(key = 'devtools'): TApi => {
  const { form } = useFormContext();
  const api = (form as unknown as Record<string, unknown>)[key];
  if (api === undefined || api === null) {
    throw new Error(
      `useDevtools: no plugin registered under form.${key}. ` +
        `Add \`.use(devtoolsPlugin())\` to your createForm(...) chain before rendering the devtools panel.`,
    );
  }
  return api as TApi;
};
