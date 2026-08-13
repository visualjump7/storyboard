'use server';

import { timingSafeEqual } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Constant-time compare so the gate can't be probed character-by-character. */
function matches(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Single-password gate.
 *
 * The app's data is protected by RLS policies keyed on `auth.uid()`, so a
 * bare password check isn't enough on its own — without a real Supabase
 * session every query returns nothing. So on a correct password we mint a
 * session for the owner account server-side: the service-role key generates a
 * magic-link token, which we immediately redeem to set the normal auth
 * cookies. The browser still ends up with an ordinary Supabase session, so
 * every downstream component and RLS policy keeps working untouched.
 *
 * The owner's credentials never reach the browser — only the resulting
 * session cookies do.
 */
export async function signIn(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  // Trimmed because these are set through dashboards and CLI prompts, which
  // readily append a stray newline or space that would silently never match.
  const expected = process.env.STORYBOARD_PASSWORD?.trim();
  const ownerEmail = process.env.STORYBOARD_OWNER_EMAIL?.trim();

  if (!expected || !ownerEmail) {
    return {
      error:
        'Server not configured: set STORYBOARD_PASSWORD and STORYBOARD_OWNER_EMAIL.',
    };
  }

  const submitted = String(formData.get('password') ?? '');
  if (!matches(submitted, expected)) {
    return { error: 'Incorrect password.' };
  }

  // Mint a one-time token for the owner account, then redeem it for a session.
  const admin = createAdminClient();
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return {
      error: `Could not start a session for ${ownerEmail}: ${
        linkError?.message ?? 'no token returned'
      }`,
    };
  }

  const supabase = createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  });

  if (verifyError) {
    return { error: `Could not start a session: ${verifyError.message}` };
  }

  // Session cookies are set — middleware keeps them refreshed from here.
  redirect('/');
}
