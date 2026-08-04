import type { EventMap } from '@flowform/core';
import { createFormHooks, FormProvider } from '@flowform/react';
import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DevtoolsPanel } from './DevtoolsPanel';
import { createSignupForm, type SignupValues } from './form';

type Form = ReturnType<typeof createSignupForm>;

const { useField, useStep, useForm } = createFormHooks<SignupValues>();

const stepProviders: Record<string, string> = {
  account: 'Zod',
  profile: 'Yup',
  security: 'class-validator',
  shipping: 'Joi',
  consent: 'Ajv',
  terms: 'manual',
};

const FieldError = ({ path }: { path: string }): ReactElement | null => {
  const { error } = useField(path as never);
  if (error === undefined) {
    return null;
  }
  return <p style={styles.error}>{error}</p>;
};

const TextField = ({
  path,
  label,
  type = 'text',
}: {
  path:
    | 'account.email'
    | 'account.password'
    | 'profile.displayName'
    | 'security.pin'
    | 'shipping.address'
    | 'shipping.zip';
  label: string;
  type?: string;
}): ReactElement => {
  const { register } = useField(path);
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <input style={styles.input} type={type} {...register()} />
      <FieldError path={path} />
    </label>
  );
};

const CheckboxField = ({
  path,
  label,
}: {
  path: 'terms.accepted' | 'needsShipping' | 'consent.acceptedTos';
  label: string;
}): ReactElement => {
  const { register } = useField(path);
  return (
    <label style={styles.checkbox}>
      <input type="checkbox" {...register({ type: 'checkbox' })} />
      <span>{label}</span>
      <FieldError path={path} />
    </label>
  );
};

const StepBody = ({ step }: { step: string | null }): ReactElement => {
  if (step === 'account') {
    return (
      <>
        <TextField path="account.email" label="Email" />
        <TextField path="account.password" label="Password" type="password" />
      </>
    );
  }
  if (step === 'profile') {
    return (
      <>
        <TextField path="profile.displayName" label="Display name" />
        <CheckboxField
          path="needsShipping"
          label="I need shipping (adds a conditional step)"
        />
      </>
    );
  }
  if (step === 'security') {
    return (
      <TextField
        path="security.pin"
        label="PIN (min 4 chars)"
        type="password"
      />
    );
  }
  if (step === 'shipping') {
    return (
      <>
        <TextField path="shipping.address" label="Address" />
        <TextField path="shipping.zip" label="ZIP" />
      </>
    );
  }
  if (step === 'consent') {
    return (
      <CheckboxField
        path="consent.acceptedTos"
        label="I accept the Terms of Service"
      />
    );
  }
  if (step === 'terms') {
    return (
      <CheckboxField
        path="terms.accepted"
        label="I accept the terms and conditions"
      />
    );
  }
  return <p>Done.</p>;
};

const Wizard = (): ReactElement => {
  const {
    currentStep: step,
    activeSteps,
    index,
    total,
    isFirst,
    isLast,
    next,
    prev,
  } = useStep();
  const { values, isSubmitting, handleSubmit } = useForm();
  const [submitted, setSubmitted] = useState<SignupValues | null>(null);

  const onSubmit = handleSubmit((valid) => {
    setSubmitted(valid);
  });

  return (
    <div style={styles.card}>
      <h1 style={styles.title}>@flowform/react</h1>
      <p style={styles.subtitle}>
        Provider + hooks — same headless core, zero manual store glue.
      </p>

      <div style={styles.progress}>
        {activeSteps.map((id) => {
          const isCurrent = id === step;
          const isDone = activeSteps.indexOf(id) < index;
          return (
            <span
              key={id}
              style={{
                ...styles.dot,
                ...(isCurrent ? styles.dotActive : {}),
                ...(isDone ? styles.dotDone : {}),
              }}
            >
              {id} · {stepProviders[id] ?? '—'}
            </span>
          );
        })}
      </div>
      <p style={styles.subtitle}>Active steps: {activeSteps.join(' → ')}</p>

      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <div style={styles.body}>
          <StepBody step={step} />
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.button}
            onClick={prev}
            disabled={isFirst}
          >
            Back
          </button>
          {isLast ? (
            <button
              type="submit"
              style={{ ...styles.button, ...styles.primary }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          ) : (
            <button
              type="button"
              style={{ ...styles.button, ...styles.primary }}
              onClick={() => {
                void next();
              }}
              disabled={index >= total - 1}
            >
              Next
            </button>
          )}
        </div>
      </form>

      {submitted !== null && (
        <p style={styles.success}>
          Submitted ✓ — {String(submitted.account.email || '(no email)')}
        </p>
      )}

      <h2 style={styles.title}>Live form values</h2>
      <pre style={styles.pre}>{JSON.stringify(values, null, 2)}</pre>
    </div>
  );
};

const App = (): ReactElement => {
  const form = useMemo<Form>(() => createSignupForm(), []);
  const [log, setLog] = useState<string[]>([]);

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
    const offSubmit = form.bus.on('submit:end', (p: EventMap['submit:end']) => {
      setLog((l) => [`submit:end ok=${String(p.ok)}`, ...l]);
    });
    return () => {
      offStep();
      offField();
      offSubmit();
    };
  }, [form]);

  return (
    <div style={styles.page}>
      <FormProvider form={form} mode="onChange" reValidateMode="onChange">
        <Wizard />

        <div style={styles.card}>
          <h2 style={styles.title}>Event bus log</h2>
          <pre style={styles.pre}>{log.join('\n') || '(no events yet)'}</pre>

          <h2 style={styles.title}>Devtools timeline (web component)</h2>
          <DevtoolsPanel />
        </div>
      </FormProvider>
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
  progress: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
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
  success: { color: '#166534', fontSize: 14, margin: '12px 0 0' },
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
