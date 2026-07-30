import {
  createForm,
  type FormCore,
  type Step,
  type Validator,
} from '@flowform/core';

export interface SignupValues {
  account: { email: string; password: string };
  profile: { displayName: string };
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
      terms: { accepted: false },
    },
    steps: signupSteps,
  });
