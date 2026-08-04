import { toValidator } from '@flowform/adapter-core';
import {
  createForm,
  type ErrorMap,
  type FormCore,
  type Step,
  type Validator,
} from '@flowform/core';
import { devtoolsPlugin } from '@flowform/plugin-devtools';
import { stepsConditionalPlugin } from '@flowform/plugin-steps-conditional';
import Ajv from 'ajv';
import { IsNotEmpty, MinLength } from 'class-validator';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

export interface SignupValues {
  account: { email: string; password: string };
  profile: { displayName: string };
  security: { pin: string };
  needsShipping: boolean;
  shipping: { address: string; zip: string };
  consent: { acceptedTos: boolean };
  terms: { accepted: boolean };
}

const asStepValidator = <T>(validator: Validator<T>): Validator<SignupValues> =>
  validator as unknown as Validator<SignupValues>;

const prefixKeys = (map: ErrorMap, prefix: string): ErrorMap => {
  const out: Record<string, readonly string[]> = {};
  for (const [key, messages] of Object.entries(map)) {
    out[key === '' ? prefix : `${prefix}.${key}`] = messages;
  }
  return out;
};

const sliced =
  <TSlice>(
    read: (values: SignupValues) => TSlice,
    prefix: string,
    validator: Validator<TSlice>,
  ): Validator<SignupValues> =>
  async (values) => {
    const result = await validator(read(values));
    return prefixKeys(result, prefix);
  };

const accountSchema = z.object({
  account: z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
  }),
});

const profileSchema = yup.object({
  profile: yup.object({
    displayName: yup.string().required('Display name is required'),
  }),
});

class SecurityDto {
  @IsNotEmpty({ message: 'PIN is required' })
  @MinLength(4, { message: 'PIN must be at least 4 characters' })
  pin!: string;
}

const shippingSchema = Joi.object({
  shipping: Joi.object({
    address: Joi.string().min(1).required().messages({
      'string.empty': 'Address is required',
      'any.required': 'Address is required',
    }),
  })
    .unknown(true)
    .required(),
}).unknown(true);

const ajv = new Ajv({ allErrors: true });
const consentValidateFn = ajv.compile({
  type: 'object',
  properties: {
    acceptedTos: { const: true },
  },
  required: ['acceptedTos'],
});

const termsRequired: Validator<SignupValues> = (values) =>
  values.terms.accepted
    ? {}
    : { 'terms.accepted': ['You must accept the terms'] };

export const signupSteps: readonly Step<SignupValues>[] = [
  { id: 'account', validate: asStepValidator(toValidator(accountSchema)) },
  { id: 'profile', validate: asStepValidator(toValidator(profileSchema)) },
  {
    id: 'security',
    validate: sliced(
      (v) => v.security,
      'security',
      toValidator<{ pin: string }>(SecurityDto),
    ),
  },
  { id: 'shipping', validate: asStepValidator(toValidator(shippingSchema)) },
  {
    id: 'consent',
    validate: sliced(
      (v) => v.consent,
      'consent',
      toValidator<{ acceptedTos: boolean }>(consentValidateFn),
    ),
  },
  { id: 'terms', validate: termsRequired },
];

export const createSignupForm = (): FormCore<SignupValues> =>
  createForm<SignupValues>({
    initialValues: {
      account: { email: '', password: '' },
      profile: { displayName: '' },
      security: { pin: '' },
      needsShipping: false,
      shipping: { address: '', zip: '' },
      consent: { acceptedTos: false },
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
