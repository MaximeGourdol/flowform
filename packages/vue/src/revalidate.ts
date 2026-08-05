import type { Path } from '@flowform/core';
import type { FieldTrigger, FlowFormContext } from './context.js';

export const revalidate = async <TValues>(
  ctx: FlowFormContext<TValues>,
  path: Path<TValues>,
  trigger: FieldTrigger,
): Promise<void> => {
  const inError = (ctx.core.store.getState().errors[path] ?? []).length > 0;
  const active = inError ? ctx.reValidateMode : ctx.mode;
  const matches =
    (active === 'onChange' && trigger === 'change') ||
    (active === 'onBlur' && trigger === 'blur');
  if (!matches) {
    return;
  }
  const before = ctx.core.store.getState().errors;
  await ctx.core.steps.trigger('current');
  const messages = ctx.core.store.getState().errors[path];
  const next: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(before)) {
    if (key !== path) {
      next[key] = value;
    }
  }
  if (messages !== undefined && messages.length > 0) {
    next[path] = messages;
  }
  ctx.core.store.setErrors(next);
  ctx.refresh();
};
