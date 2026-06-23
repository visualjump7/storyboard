import type { SupabaseClient } from '@supabase/supabase-js';

/** Fetch a project's script content (empty string if none yet). */
export async function fetchScript(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('script')
    .select('content')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data?.content ?? '';
}

/** Save a project's script. One row per project, upserted on project_id. */
export async function saveScript(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('script')
    .upsert(
      { user_id: userId, project_id: projectId, content, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' },
    );
  if (error) throw error;
}
