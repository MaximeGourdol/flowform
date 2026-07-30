import {
  createForm,
  type FormCore,
  type Step,
  type Validator,
} from '@flowform/core';
import { devtoolsPlugin } from '@flowform/plugin-devtools';
import { stepsConditionalPlugin } from '@flowform/plugin-steps-conditional';

export interface SignupValues {
  account: { email: string; password: string };
  profile: { displayName: string };
  needsShipping: boolean;
  shipping: { address: string; zip: string };
  terms: { accepted: boolean };
}

const required =
  (
    path: string,
    read: (values: SignupValues) => unknown,
    message: string,
  ): Validator<SignupValues> =>
  (values) => {
    const value = read(values);
    if (value === '' || value === false || value === undefined) {
      return { [path]: [message] };
    }
    return {};
  };

export const signupSteps: readonly Step<SignupValues>[] = [
  {
    id: 'account',
    validate: required(
      'account.email',
      (v) => v.account.email,
      'Email is required',
    ),
  },
  {
    id: 'profile',
    validate: required(
      'profile.displayName',
      (v) => v.profile.displayName,
      'Display name is required',
    ),
  },
  {
    id: 'shipping',
    validate: required(
      'shipping.address',
      (v) => v.shipping.address,
      'Address is required',
    ),
  },
  {
    id: 'terms',
    validate: required(
      'terms.accepted',
      (v) => v.terms.accepted,
      'You must accept the terms',
    ),
  },
];

export const createSignupForm = (): FormCore<SignupValues> =>
  createForm<SignupValues>({
    initialValues: {
      account: { email: '', password: '' },
      profile: { displayName: '' },
      needsShipping: false,
      shipping: { address: '', zip: '' },
      terms: { accepted: false },
    },
    steps: signupSteps,
  })
    .use(devtoolsPlugin())
    .use(
      stepsConditionalPlugin<SignupValues>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [
              { path: 'shipping.address', resetTo: '' },
              { path: 'shipping.zip', resetTo: '' },
            ],
          },
        ],
      }),
    );
