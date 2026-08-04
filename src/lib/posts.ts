import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostFields } from './types';

/**
 * Persist edits to a post's fields (copy, status, schedule, platforms, name…).
 * Kept out of scenes.ts so the storyboard code path stays untouched; the shape
 * mirrors updateSceneFields, including the manual updated_at.
 */
export async function updatePostFields(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<PostFields>,
): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
