'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from '@/app/login/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-[42px] w-full rounded-[9px] bg-accent text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Entering…' : 'Enter'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(signIn, { error: null });

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 font-sans text-ink">
      <form
        action={formAction}
        className="w-full max-w-[360px] rounded-2xl border border-line bg-surface p-7 shadow-card"
      >
        <div className="mb-6 flex items-center gap-[11px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[16px] font-bold text-canvas">
            S
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Storyboard</span>
        </div>

        <label
          htmlFor="password"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="mb-5 h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[14px] text-bright outline-none transition-colors focus:border-accent"
        />

        {state.error && <p className="mb-4 text-[12.5px] text-[#e06464]">{state.error}</p>}

        <SubmitButton />
      </form>
    </div>
  );
}
