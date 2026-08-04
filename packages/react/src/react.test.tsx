import type { ErrorMap, Validator } from '@flowform/core';
import { createForm } from '@flowform/core';
import { stepsConditionalPlugin } from '@flowform/plugin-steps-conditional';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createFormHooks } from './create-form-hooks.js';
import { FormProvider } from './provider.js';
import { useDevtools } from './use-devtools.js';

afterEach(cleanup);

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

interface Values {
  account: { email: string; password: string };
  needsShipping: boolean;
  address: string;
}

const emptyErrors: ErrorMap = {};

const makeForm = (
  accountValidate?: Validator<Values>,
): ReturnType<typeof createForm<Values>> =>
  createForm<Values>({
    initialValues: {
      account: { email: '', password: '' },
      needsShipping: false,
      address: '',
    },
    steps: [
      {
        id: 'account',
        ...(accountValidate ? { validate: accountValidate } : {}),
      },
      { id: 'shipping' },
      { id: 'review' },
    ],
  });

const hooks = createFormHooks<Values>();

describe('useField.register', () => {
  it('binds value and updates the store on change', () => {
    const form = makeForm();
    const Field = (): ReactNode => {
      const { register } = hooks.useField('account.email');
      return <input aria-label="email" {...register()} />;
    };
    render(
      <FormProvider form={form}>
        <Field />
      </FormProvider>,
    );
    const input = screen.getByLabelText<HTMLInputElement>('email');
    fireEvent.change(input, { target: { value: 'a@b.co' } });
    expect(input.value).toBe('a@b.co');
    expect(form.store.getValue('account.email')).toBe('a@b.co');
  });

  it('emits field:change on change (conditional plugin dependency)', () => {
    const form = makeForm();
    const spy = vi.fn();
    form.bus.on('field:change', spy);
    const Field = (): ReactNode => {
      const { register } = hooks.useField('account.email');
      return <input aria-label="email" {...register()} />;
    };
    render(
      <FormProvider form={form}>
        <Field />
      </FormProvider>,
    );
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'x' },
    });
    expect(spy).toHaveBeenCalledWith({ path: 'account.email', value: 'x' });
  });

  it('marks touched on blur', () => {
    const form = makeForm();
    const Field = (): ReactNode => {
      const { register, touched } = hooks.useField('account.email');
      return (
        <>
          <input aria-label="email" {...register()} />
          <span data-testid="touched">{String(touched)}</span>
        </>
      );
    };
    render(
      <FormProvider form={form}>
        <Field />
      </FormProvider>,
    );
    expect(screen.getByTestId('touched').textContent).toBe('false');
    fireEvent.blur(screen.getByLabelText('email'));
    expect(screen.getByTestId('touched').textContent).toBe('true');
  });

  it('binds a checkbox via register({ type: checkbox })', () => {
    const form = makeForm();
    const Field = (): ReactNode => {
      const { register } = hooks.useField('needsShipping');
      return (
        <input
          aria-label="ship"
          type="checkbox"
          {...register({ type: 'checkbox' })}
        />
      );
    };
    render(
      <FormProvider form={form}>
        <Field />
      </FormProvider>,
    );
    const box = screen.getByLabelText<HTMLInputElement>('ship');
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(form.store.getValue('needsShipping')).toBe(true);
  });
});

describe('useStep', () => {
  const blockingValidator: Validator<Values> = (values) =>
    values.account.email === ''
      ? { 'account.email': ['Required'] }
      : emptyErrors;

  const Harness = (): ReactNode => {
    const { register, error } = hooks.useField('account.email');
    const { currentStep, next, prev, isFirst, isLast } = hooks.useStep();
    return (
      <>
        <span data-testid="step">{currentStep}</span>
        <span data-testid="error">{error ?? ''}</span>
        <input aria-label="email" {...register()} />
        <button
          onClick={() => {
            void next();
          }}
        >
          next
        </button>
        <button onClick={prev}>prev</button>
        <span data-testid="first">{String(isFirst)}</span>
        <span data-testid="last">{String(isLast)}</span>
      </>
    );
  };

  it('blocks next when the step validator returns errors, surfaces the error', async () => {
    const form = makeForm(blockingValidator);
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    expect(screen.getByTestId('step').textContent).toBe('account');
    fireEvent.click(screen.getByText('next'));
    await flush();
    expect(screen.getByTestId('step').textContent).toBe('account');
    expect(screen.getByTestId('error').textContent).toBe('Required');
  });

  it('advances when the step validator passes', async () => {
    const form = makeForm(blockingValidator);
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.click(screen.getByText('next'));
    await flush();
    expect(screen.getByTestId('step').textContent).toBe('shipping');
    expect(screen.getByTestId('error').textContent).toBe('');
  });
});

describe('useStep with conditional plugin', () => {
  const Harness = (): ReactNode => {
    const { register } = hooks.useField('needsShipping');
    const { activeSteps, currentStep } = hooks.useStep();
    return (
      <>
        <span data-testid="active">{activeSteps.join(',')}</span>
        <span data-testid="step">{currentStep}</span>
        <input
          aria-label="ship"
          type="checkbox"
          {...register({ type: 'checkbox' })}
        />
      </>
    );
  };

  it('removes an inactive step from activeSteps and re-navigates off it', async () => {
    const form = makeForm().use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [{ path: 'address', resetTo: '' }],
          },
        ],
      }),
    );
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    expect(screen.getByTestId('active').textContent).toBe('account,review');
    fireEvent.click(screen.getByLabelText('ship'));
    await flush();
    expect(screen.getByTestId('active').textContent).toBe(
      'account,shipping,review',
    );
    form.steps.goTo('shipping');
    fireEvent.click(screen.getByLabelText('ship'));
    await flush();
    expect(screen.getByTestId('active').textContent).toBe('account,review');
    expect(form.steps.currentStep()).toBe('account');
  });
});

describe('useForm.handleSubmit', () => {
  it('runs all validators, toggles isSubmitting, calls onValid only when valid', async () => {
    const form = makeForm();
    const onValid = vi.fn();
    const Harness = (): ReactNode => {
      const { handleSubmit, isSubmitting } = hooks.useForm();
      return (
        <form
          onSubmit={(event) => {
            void handleSubmit(onValid)(event);
          }}
        >
          <span data-testid="submitting">{String(isSubmitting)}</span>
          <button type="submit">go</button>
        </form>
      );
    };
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    await flush();
    expect(onValid).toHaveBeenCalledOnce();
    expect(screen.getByTestId('submitting').textContent).toBe('false');
  });

  it('does not call onValid when a step validator fails', async () => {
    const form = makeForm((values) =>
      values.account.email === '' ? { 'account.email': ['Required'] } : {},
    );
    const onValid = vi.fn();
    const Harness = (): ReactNode => {
      const { handleSubmit, errors } = hooks.useForm();
      return (
        <form
          onSubmit={(event) => {
            void handleSubmit(onValid)(event);
          }}
        >
          <span data-testid="err">{Object.keys(errors).join(',')}</span>
          <button type="submit">go</button>
        </form>
      );
    };
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    await flush();
    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByTestId('err').textContent).toBe('account.email');
  });
});

describe('validation modes', () => {
  const emailRequired: Validator<Values> = (values) =>
    values.account.email.includes('@')
      ? emptyErrors
      : { 'account.email': ['Invalid email'] };

  const Harness = (): ReactNode => {
    const { register, error } = hooks.useField('account.email');
    const { next } = hooks.useStep();
    return (
      <>
        <span data-testid="error">{error ?? ''}</span>
        <input aria-label="email" {...register()} />
        <button
          onClick={() => {
            void next();
          }}
        >
          next
        </button>
      </>
    );
  };

  it('mode=onSubmit + reValidateMode=onChange clears the error as the field becomes valid', async () => {
    const form = makeForm(emailRequired);
    render(
      <FormProvider form={form} mode="onSubmit" reValidateMode="onChange">
        <Harness />
      </FormProvider>,
    );
    fireEvent.click(screen.getByText('next'));
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('Invalid email');

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'ada' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('Invalid email');

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'ada@x.co' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('mode=onSubmit does not surface errors while typing before submit', async () => {
    const form = makeForm(emailRequired);
    render(
      <FormProvider form={form} mode="onSubmit" reValidateMode="onChange">
        <Harness />
      </FormProvider>,
    );
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'x' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('mode=onChange surfaces errors on every keystroke from the start', async () => {
    const form = makeForm(emailRequired);
    render(
      <FormProvider form={form} mode="onChange">
        <Harness />
      </FormProvider>,
    );
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'x' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('Invalid email');
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'x@y.co' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('reValidateMode=onBlur only clears the error on blur, not on change', async () => {
    const form = makeForm(emailRequired);
    render(
      <FormProvider form={form} mode="onSubmit" reValidateMode="onBlur">
        <Harness />
      </FormProvider>,
    );
    fireEvent.click(screen.getByText('next'));
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('Invalid email');
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'ada@x.co' },
    });
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('Invalid email');
    fireEvent.blur(screen.getByLabelText('email'));
    await flush();
    expect(screen.getByTestId('error').textContent).toBe('');
  });
});

describe('useDevtools', () => {
  const devtoolsPlugin = (): {
    name: string;
    install: () => { getEventLog: () => unknown[] };
  } => ({
    name: 'devtools',
    install: () => ({ getEventLog: () => [] }),
  });

  const Consumer = (): ReactNode => {
    const api = useDevtools<{ getEventLog: () => unknown[] }>();
    return <span data-testid="ok">{typeof api.getEventLog}</span>;
  };

  it('returns the plugin api when the plugin is registered', () => {
    const form = makeForm().use(devtoolsPlugin());
    render(
      <FormProvider form={form}>
        <Consumer />
      </FormProvider>,
    );
    expect(screen.getByTestId('ok').textContent).toBe('function');
  });

  it('throws a specific message when the plugin is missing', () => {
    const form = makeForm();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <FormProvider form={form}>
          <Consumer />
        </FormProvider>,
      ),
    ).toThrow(/devtoolsPlugin/);
    spy.mockRestore();
  });
});

describe('sync-store render safety', () => {
  it('does not enter an infinite render loop', () => {
    const form = makeForm();
    let renders = 0;
    const Counter = (): ReactNode => {
      renders += 1;
      hooks.useForm();
      hooks.useField('account.email');
      return null;
    };
    render(
      <FormProvider form={form}>
        <Counter />
      </FormProvider>,
    );
    expect(renders).toBeLessThan(5);
  });
});
