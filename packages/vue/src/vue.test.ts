import { createForm, type Validator } from '@formjourney/core';
import { stepsConditionalPlugin } from '@formjourney/plugin-steps-conditional';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { createVueForm } from './create.js';
import {
  provideForm,
  type CreateContextOptions,
  type FormJourneyContext,
} from './context.js';
import { useField } from './use-field.js';
import { useStep } from './use-step.js';
import { useForm } from './use-form.js';
import { useFieldList } from './use-field-list.js';

interface Values {
  email: string;
  needsShipping: boolean;
  tags: { label: string }[];
}

const emailRequired: Validator<Values> = (v) =>
  v.email === '' ? { email: ['Required'] } : {};

const makeCtx = (options?: CreateContextOptions): FormJourneyContext<Values> =>
  createVueForm<Values>(
    () =>
      createForm<Values>({
        initialValues: {
          email: '',
          needsShipping: false,
          tags: [{ label: 'a' }],
        },
        steps: [
          { id: 'account', validate: emailRequired, fields: ['email'] },
          { id: 'review' },
        ],
      }),
    options,
  );

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const d of disposers.splice(0)) {
    d();
  }
});

const harness = (
  ctx: FormJourneyContext<Values>,
  setup: () => () => unknown,
): VueWrapper => {
  disposers.push(ctx.dispose);
  const child: Component = defineComponent({ setup });
  const parent: Component = defineComponent({
    setup() {
      provideForm(ctx);
      return () => h(child);
    },
  });
  return mount(parent);
};

describe('useField — v-model binding', () => {
  it('exposes a writable model and reflects store writes', () => {
    const ctx = makeCtx();
    let field!: ReturnType<typeof useField<Values, 'email'>>;
    harness(ctx, () => {
      field = useField<Values, 'email'>('email');
      return () => h('div');
    });
    expect(field.model.value).toBe('');
    field.model.value = 'a@b.co';
    expect(ctx.core.store.getValue('email')).toBe('a@b.co');
    expect(field.value.value).toBe('a@b.co');
  });
});

describe('useStep — navigation', () => {
  it('blocks next on invalid, advances on valid, surfaces error', async () => {
    const ctx = makeCtx();
    let step!: ReturnType<typeof useStep>;
    let field!: ReturnType<typeof useField<Values, 'email'>>;
    harness(ctx, () => {
      step = useStep();
      field = useField<Values, 'email'>('email');
      return () => h('div');
    });
    expect(step.currentStep.value).toBe('account');
    expect(await step.next()).toBe(false);
    expect(step.currentStep.value).toBe('account');
    expect(field.error.value).toBe('Required');

    field.model.value = 'a@b.co';
    expect(await step.next()).toBe(true);
    expect(step.currentStep.value).toBe('review');
  });
});

describe('useFieldList', () => {
  it('append/remove/move update reactively', () => {
    const ctx = makeCtx();
    let list!: ReturnType<typeof useFieldList<Values, 'tags'>>;
    harness(ctx, () => {
      list = useFieldList<Values, 'tags'>('tags');
      return () => h('div');
    });
    expect(list.items.value.length).toBe(1);
    list.append({ label: 'b' });
    expect(list.items.value.length).toBe(2);
    list.moveItem(0, 1);
    expect(list.items.value.map((t) => t.label)).toEqual(['b', 'a']);
    list.removeAt(0);
    expect(list.items.value.length).toBe(1);
  });
});

describe('useForm — submit + derived', () => {
  it('calls onValid only when valid, tracks submitCount', async () => {
    const ctx = makeCtx();
    let form!: ReturnType<typeof useForm<Values>>;
    let field!: ReturnType<typeof useField<Values, 'email'>>;
    harness(ctx, () => {
      form = useForm<Values>();
      field = useField<Values, 'email'>('email');
      return () => h('div');
    });
    let called = 0;
    await form.submit(() => {
      called += 1;
    });
    expect(called).toBe(0);
    expect(form.isValid.value).toBe(false);

    field.model.value = 'a@b.co';
    await form.submit(() => {
      called += 1;
    });
    expect(called).toBe(1);
    expect(form.submitCount.value).toBe(2);
  });
});

describe('conditional steps', () => {
  it('activeSteps reflects the plugin', () => {
    const ctx = createVueForm<Values>(() =>
      createForm<Values>({
        initialValues: { email: '', needsShipping: false, tags: [] },
        steps: [{ id: 'account' }, { id: 'shipping' }, { id: 'review' }],
      }).use(
        stepsConditionalPlugin<Values>({
          rules: [
            {
              stepId: 'shipping',
              when: { field: 'needsShipping', filled: true },
              clears: [],
            },
          ],
        }),
      ),
    );
    let step!: ReturnType<typeof useStep>;
    let field!: ReturnType<typeof useField<Values, 'needsShipping'>>;
    harness(ctx, () => {
      step = useStep();
      field = useField<Values, 'needsShipping'>('needsShipping');
      return () => h('div');
    });
    expect(step.activeSteps.value).toEqual(['account', 'review']);
    field.model.value = true;
    expect(step.activeSteps.value).toEqual(['account', 'shipping', 'review']);
  });
});

describe('validation modes', () => {
  it('onSubmit + reValidate onChange: no error typing, clears once invalid', async () => {
    const ctx = makeCtx({ mode: 'onSubmit', reValidateMode: 'onChange' });
    let form!: ReturnType<typeof useForm<Values>>;
    let field!: ReturnType<typeof useField<Values, 'email'>>;
    harness(ctx, () => {
      form = useForm<Values>();
      field = useField<Values, 'email'>('email');
      return () => h('div');
    });
    field.model.value = '';
    await Promise.resolve();
    expect(field.error.value).toBeUndefined();

    await form.trigger('current');
    expect(field.error.value).toBe('Required');

    field.model.value = 'a@b.co';
    await Promise.resolve();
    await Promise.resolve();
    expect(field.error.value).toBeUndefined();
  });
});
