import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server-only code (the public /share page).
 * Bypasses RLS entirely — use it exclusively for narrowly-scoped reads keyed
 * on an unguessable token. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_
 * prefix, so Next.js never inlines it into client bundles; the window guard
 * catches an accidental client-side import at runtime anyway.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient is server-only.');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. The share ' +
        'page needs both — on Vercel add SUPABASE_SERVICE_ROLE_KEY under ' +
        'Project → Settings → Environment Variables (mark it Sensitive).',
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js patches global fetch with a data cache (plus an HMR cache in
      // dev) that can serve stale Supabase responses even under force-dynamic.
      // The share page must always show current data, so opt out per-request.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
