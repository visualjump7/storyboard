'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Let the server re-read the refreshed session, then enter the app.
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 font-sans text-ink">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[360px] rounded-2xl border border-line bg-surface p-7 shadow-card"
      >
        <div className="mb-6 flex items-center gap-[11px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[16px] font-bold text-canvas">
            S
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Storyboard</span>
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[14px] text-bright outline-none transition-colors focus:border-accent"
        />

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[14px] text-bright outline-none transition-colors focus:border-accent"
        />

        {error && <p className="mb-4 text-[12.5px] text-[#e06464]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="h-[42px] w-full rounded-[9px] bg-accent text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
