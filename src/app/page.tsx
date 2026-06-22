import { redirect } from 'next/navigation';
import { Storyboard } from '@/components/Storyboard';
import { createClient } from '@/lib/supabase/server';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <Storyboard userId={user.id} />;
}
