import type { SupabaseClient } from '@supabase/supabase-js';

/** Fetch the user's script content (empty string if none yet). */
export async function fetchScript(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.from('script').select('content').maybeSingle();
  if (error) throw error;
  return data?.content ?? '';
}

/** Save the user's script. One row per user, upserted on user_id. */
export async function saveScript(
  supabase: SupabaseClient,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('script')
    .upsert(
      { user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
