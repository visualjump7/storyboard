import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scene, SceneTextFields } from './types';
import { removeObjects, removeSceneFolder, uploadImage } from './storage';

/** Fetch all of the current user's scenes in display order. */
export async function fetchScenes(supabase: SupabaseClient): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Scene[];
}

/** Create a new empty scene at the end of the board. */
export async function createScene(
  supabase: SupabaseClient,
  userId: string,
  orderIndex: number,
): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .insert({
      user_id: userId,
      order_index: orderIndex,
      name: '',
      description: '',
      prompt: '',
      image_path: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Scene;
}

/** Persist edits to a scene's text fields. */
export async function updateSceneFields(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<SceneTextFields>,
): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Persist a new order as a single atomic upsert. order_index is set to each
 * row's visual position, so this is authoritative regardless of the incoming
 * order_index values — a delete that compacts indices is handled correctly,
 * and a partial failure can't leave the board half-reordered. Only id /
 * user_id / order_index are sent, so text fields are never touched.
 */
export async function persistOrder(supabase: SupabaseClient, ordered: Scene[]): Promise<void> {
  if (ordered.length === 0) return;
  const rows = ordered.map((scene, i) => ({
    id: scene.id,
    user_id: scene.user_id,
    order_index: i,
  }));
  const { error } = await supabase.from('scenes').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/** Upload a new image, point the scene at it, then delete the old object. */
export async function setSceneImage(
  supabase: SupabaseClient,
  scene: Scene,
  file: File,
): Promise<string> {
  const newPath = await uploadImage(supabase, scene.user_id, scene.id, file);

  const { error } = await supabase
    .from('scenes')
    .update({ image_path: newPath, updated_at: new Date().toISOString() })
    .eq('id', scene.id);

  if (error) {
    // Roll back the just-uploaded object so a failed update leaves no orphan.
    await removeObjects(supabase, [newPath]).catch(() => {});
    throw error;
  }

  if (scene.image_path && scene.image_path !== newPath) {
    await removeObjects(supabase, [scene.image_path]).catch(() => {});
  }
  return newPath;
}

/** Clear a scene's image and delete the stored object. */
export async function removeSceneImage(supabase: SupabaseClient, scene: Scene): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq('id', scene.id);
  if (error) throw error;
  if (scene.image_path) await removeObjects(supabase, [scene.image_path]).catch(() => {});
}

/** Delete a scene and every image object under its folder. */
export async function deleteScene(supabase: SupabaseClient, scene: Scene): Promise<void> {
  await removeSceneFolder(supabase, scene.user_id, scene.id).catch(() => {});
  const { error } = await supabase.from('scenes').delete().eq('id', scene.id);
  if (error) throw error;
}
