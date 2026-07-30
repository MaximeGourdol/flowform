import type { EventMap } from '@flowform/core';
import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createSignupForm, type SignupValues } from './form';
import { useCurrentStep, useField } from './useFlowForm';

type Form = ReturnType<typeof createSignupForm>;

const TextField = ({
  form,
  path,
  label,
  type = 'text',
}: {
  form: Form;
  path: 'account.email' | 'account.password' | 'profile.displayName';
  label: string;
  type?: string;
}): ReactElement => {
  const value = useField(form, path);
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={(e) => {
          form.store.setValue(path, e.target.value);
        }}
      />
    </label>
  );
};

const TermsField = ({ form }: { form: Form }): ReactElement => {
  const accepted = useField(form, 'terms.accepted');
  return (
    <label style={styles.checkbox}>
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => {
          form.store.setValue('terms.accepted', e.target.checked);
        }}
      />
      <span>I accept the terms and conditions</span>
    </label>
  );
};

const StepBody = ({
  form,
  step,
}: {
  form: Form;
  step: string | null;
}): ReactElement => {
  if (step === 'account') {
    return (
      <>
        <TextField form={form} path="account.email" label="Email" />
        <TextField
          form={form}
          path="account.password"
          label="Password"
          type="password"
        />
      </>
    );
  }
  if (step === 'profile') {
    return (
      <TextField form={form} path="profile.displayName" label="Display name" />
    );
  }
  if (step === 'terms') {
    return <TermsField form={form} />;
  }
  return <p>Done.</p>;
};

const runStepValidator = async (
  form: Form,
  step: string | null,
): Promise<Record<string, readonly string[]>> => {
  const current = form.steps.steps.find((s) => s.id === step);
  if (current?.validate === undefined) {
    return {};
  }
  return current.validate(form.store.getState().values, {
    ...(step === null ? {} : { currentStepId: step }),
    trigger: 'step',
  });
};

const App = (): ReactElement => {
  const form = useMemo<Form>(() => createSignupForm(), []);
  const step = useCurrentStep(form);
  const [errors, setErrors] = useState<Record<string, readonly string[]>>({});
  const [log, setLog] = useState<string[]>([]);
  const [values, setValues] = useState<SignupValues>(
    () => form.store.getState().values,
  );

  useEffect(() => {
    const offStep = form.bus.on('step:change', (p: EventMap['step:change']) => {
      setLog((l) => [`step:change ${p.from ?? '∅'} → ${p.to}`, ...l]);
    });
    const offField = form.bus.on(
      'field:change',
      (p: EventMap['field:change']) => {
        setLog((l) => [`field:change ${p.path} = ${String(p.value)}`, ...l]);
      },
    );
    return () => {
      offStep();
      offField();
    };
  }, [form]);

  const syncValues = (): void => {
    setValues({ ...form.store.getState().values });
  };

  const bridge = (path: string, value: unknown): void => {
    form.bus.emit('field:change', { path, value });
    syncValues();
  };

  const onNext = async (): Promise<void> => {
    const found = await runStepValidator(form, step);
    setErrors(found);
    form.store.setErrors(found);
    if (Object.keys(found).length === 0) {
      await form.steps.goNext();
    }
  };

  const onPrev = (): void => {
    setErrors({});
    form.steps.goPrev();
  };

  const index = form.steps.currentIndex();
  const total = form.steps.steps.length;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>@flowform/core</h1>
        <p style={styles.subtitle}>
          Headless core driving a React 3-step signup — no plugins.
        </p>

        <div style={styles.progress}>
          {form.steps.steps.map((s, i) => (
            <span
              key={s.id}
              style={{
                ...styles.dot,
                ...(i === index ? styles.dotActive : {}),
                ...(i < index ? styles.dotDone : {}),
              }}
            >
              {s.id}
            </span>
          ))}
        </div>

        <div style={styles.body} onBlur={syncValues}>
          <StepBody form={form} step={step} />
        </div>

        {Object.entries(errors).map(([path, messages]) => (
          <p key={path} style={styles.error}>
            {path}: {messages.join(', ')}
          </p>
        ))}

        <div style={styles.actions}>
          <button style={styles.button} onClick={onPrev} disabled={index <= 0}>
            Back
          </button>
          <button
            style={{ ...styles.button, ...styles.primary }}
            onClick={() => {
              void onNext();
            }}
            disabled={index >= total - 1}
          >
            Next
          </button>
          <button
            style={styles.button}
            onClick={() => {
              bridge(
                'profile.displayName',
                form.store.getValue('profile.displayName'),
              );
            }}
          >
            Emit field:change
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Live store state</h2>
        <pre style={styles.pre}>
          {JSON.stringify(
            { step, index, values, storeErrors: form.store.getState().errors },
            null,
            2,
          )}
        </pre>
        <h2 style={styles.title}>Event bus log</h2>
        <pre style={styles.pre}>{log.join('\n') || '(no events yet)'}</pre>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    padding: 24,
    maxWidth: 960,
    margin: '0 auto',
    color: '#0f172a',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  title: { margin: '0 0 4px', fontSize: 18 },
  subtitle: { margin: '0 0 16px', color: '#64748b', fontSize: 13 },
  progress: { display: 'flex', gap: 8, marginBottom: 16 },
  dot: {
    padding: '4px 10px',
    borderRadius: 999,
    background: '#f1f5f9',
    fontSize: 12,
    color: '#64748b',
  },
  dotActive: { background: '#2563eb', color: '#fff' },
  dotDone: { background: '#bbf7d0', color: '#166534' },
  body: { display: 'flex', flexDirection: 'column', gap: 12, minHeight: 96 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 },
  input: {
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
  },
  checkbox: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 13, margin: '4px 0 0' },
  actions: { display: 'flex', gap: 8, marginTop: 20 },
  button: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  primary: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  pre: {
    background: '#0f172a',
    color: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    overflow: 'auto',
    margin: '0 0 16px',
  },
};

export default App;
