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
import { Control } from './use-control.js';

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

interface ListValues {
  tags: { label: string }[];
  title: string;
}

const listHooks = createFormHooks<ListValues>();

const makeListForm = (): ReturnType<typeof createForm<ListValues>> =>
  createForm<ListValues>({
    initialValues: { tags: [{ label: 'a' }], title: '' },
    steps: [{ id: 'main' }],
  });

describe('useFieldList', () => {
  const Harness = (): ReactNode => {
    const { items, append, removeAt, moveItem } =
      listHooks.useFieldList('tags');
    return (
      <>
        <span data-testid="labels">{items.map((t) => t.label).join(',')}</span>
        <button
          onClick={() => {
            append({ label: 'z' });
          }}
        >
          append
        </button>
        <button
          onClick={() => {
            removeAt(0);
          }}
        >
          remove0
        </button>
        <button
          onClick={() => {
            moveItem(0, 1);
          }}
        >
          move01
        </button>
      </>
    );
  };

  it('reflects append/remove/move reactively', () => {
    const form = makeListForm();
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    expect(screen.getByTestId('labels').textContent).toBe('a');
    fireEvent.click(screen.getByText('append'));
    expect(screen.getByTestId('labels').textContent).toBe('a,z');
    fireEvent.click(screen.getByText('move01'));
    expect(screen.getByTestId('labels').textContent).toBe('z,a');
    fireEvent.click(screen.getByText('remove0'));
    expect(screen.getByTestId('labels').textContent).toBe('a');
  });
});

describe('useFieldList — error reindexing surfaces in the UI', () => {
  const tagsRequired: Validator<ListValues> = (v) => {
    const out: Record<string, readonly string[]> = {};
    v.tags.forEach((t, i) => {
      if (t.label === '') {
        out[`tags.${String(i)}.label`] = ['Required'];
      }
    });
    return out;
  };

  const makeValidatedListForm = (): ReturnType<typeof createForm<ListValues>> =>
    createForm<ListValues>({
      initialValues: {
        tags: [{ label: 'keep' }, { label: '' }],
        title: '',
      },
      steps: [{ id: 'main', validate: tagsRequired }],
    });

  const TagError = ({ index }: { index: number }): ReactNode => {
    const field = listHooks.useField(`tags.${String(index)}.label`);
    return (
      <span data-testid={`err-${String(index)}`}>{field.error ?? ''}</span>
    );
  };

  const Harness = (): ReactNode => {
    const { items, removeAt } = listHooks.useFieldList('tags');
    const { trigger } = listHooks.useForm();
    return (
      <>
        {items.map((_, i) => (
          <TagError key={i} index={i} />
        ))}
        <button
          onClick={() => {
            void trigger('all');
          }}
        >
          validate
        </button>
        <button
          onClick={() => {
            removeAt(0);
          }}
        >
          remove0
        </button>
      </>
    );
  };

  it('moves the error to the surviving element after a remove', async () => {
    const form = makeValidatedListForm();
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    fireEvent.click(screen.getByText('validate'));
    await flush();
    expect(screen.getByTestId('err-0').textContent).toBe('');
    expect(screen.getByTestId('err-1').textContent).toBe('Required');

    fireEvent.click(screen.getByText('remove0'));
    await flush();
    expect(screen.getByTestId('err-0').textContent).toBe('Required');
  });
});

describe('useObserve', () => {
  const Harness = (): ReactNode => {
    const title = listHooks.useObserve('title');
    const all = listHooks.useObserve();
    return (
      <>
        <span data-testid="title">{title}</span>
        <span data-testid="count">{all.tags.length}</span>
      </>
    );
  };

  it('reacts to a single path and to the whole form', () => {
    const form = makeListForm();
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    expect(screen.getByTestId('title').textContent).toBe('');
    act(() => {
      form.store.setValue('title', 'Hello');
      form.bus.emit('field:change', { path: 'title', value: 'Hello' });
    });
    expect(screen.getByTestId('title').textContent).toBe('Hello');
  });
});

describe('useControl / Control', () => {
  const Harness = (): ReactNode => (
    <Control<ListValues, 'title'> name="title">
      {(c) => (
        <>
          <span data-testid="v">{c.value}</span>
          <button
            onClick={() => {
              c.onChange('X');
            }}
          >
            set
          </button>
        </>
      )}
    </Control>
  );

  it('binds a custom control via onChange(value)', () => {
    const form = makeListForm();
    render(
      <FormProvider form={form}>
        <Harness />
      </FormProvider>,
    );
    expect(screen.getByTestId('v').textContent).toBe('');
    fireEvent.click(screen.getByText('set'));
    expect(screen.getByTestId('v').textContent).toBe('X');
    expect(form.store.getValue('title')).toBe('X');
  });

  const ControlProbe = (): ReactNode => {
    const c = listHooks.useControl('title');
    return (
      <>
        <span data-testid="touched">{String(c.touched)}</span>
        <span data-testid="err">{c.error ?? ''}</span>
        <button onClick={c.onBlur}>blur</button>
      </>
    );
  };

  it('marks touched via onBlur and surfaces a reactive error', () => {
    const form = makeListForm();
    render(
      <FormProvider form={form}>
        <ControlProbe />
      </FormProvider>,
    );
    expect(screen.getByTestId('touched').textContent).toBe('false');
    fireEvent.click(screen.getByText('blur'));
    expect(screen.getByTestId('touched').textContent).toBe('true');

    expect(screen.getByTestId('err').textContent).toBe('');
    act(() => {
      form.store.setError('title', ['Bad title']);
    });
    expect(screen.getByTestId('err').textContent).toBe('Bad title');
  });

  const NumberControl = (): ReactNode => {
    const c = listHooks.useControl('tags');
    return (
      <>
        <span data-testid="len">{c.value.length}</span>
        <button
          onClick={() => {
            c.onChange([{ label: 'a' }, { label: 'b' }]);
          }}
        >
          set2
        </button>
      </>
    );
  };

  it('supports a non-string (object array) value', () => {
    const form = makeListForm();
    render(
      <FormProvider form={form}>
        <NumberControl />
      </FormProvider>,
    );
    expect(screen.getByTestId('len').textContent).toBe('1');
    fireEvent.click(screen.getByText('set2'));
    expect(screen.getByTestId('len').textContent).toBe('2');
  });
});

describe('useForm derived meta + core delegation', () => {
  const Harness = (): ReactNode => {
    const { isValid, isDirty, submitCount, values } = listHooks.useForm();
    return (
      <>
        <span data-testid="valid">{String(isValid)}</span>
        <span data-testid="dirty">{String(isDirty)}</span>
        <span data-testid="count">{submitCount}</span>
        <span data-testid="title">{values.title}</span>
      </>
    );
  };

  it('exposes derived state that updates on submit', async () => {
    const form = makeListForm();
    const Wrapper = (): ReactNode => {
      const { handleSubmit } = listHooks.useForm();
      return (
        <form
          onSubmit={(e) => {
            void handleSubmit(() => undefined)(e);
          }}
        >
          <Harness />
          <button type="submit">go</button>
        </form>
      );
    };
    render(
      <FormProvider form={form}>
        <Wrapper />
      </FormProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    fireEvent.click(screen.getByText('go'));
    await flush();
    expect(screen.getByTestId('count').textContent).toBe('1');
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
