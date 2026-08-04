import type { SupabaseClient } from '@supabase/supabase-js';
import type { SceneMedia } from './types';
import { mediaKindFor, removeObjects, uploadMedia } from './storage';

/**
 * Fetch media for a set of posts in one query, grouped by scene id and
 * ordered by position. Returns an empty map for an empty input.
 */
export async function fetchMediaForScenes(
  supabase: SupabaseClient,
  sceneIds: string[],
): Promise<Record<string, SceneMedia[]>> {
  if (sceneIds.length === 0) return {};
  const { data, error } = await supabase
    .from('scene_media')
    .select('*')
    .in('scene_id', sceneIds)
    .order('position', { ascending: true });
  if (error) throw error;

  const map: Record<string, SceneMedia[]> = {};
  ((data ?? []) as SceneMedia[]).forEach((m) => {
    (map[m.scene_id] ??= []).push(m);
  });
  return map;
}

/**
 * Upload one file and attach it to a post at the given position. Rolls back
 * the uploaded object if the row insert fails (same pattern as setSceneImage).
 */
export async function addSceneMedia(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  file: File,
  position: number,
): Promise<SceneMedia> {
  const path = await uploadMedia(supabase, userId, sceneId, file);
  const { data, error } = await supabase
    .from('scene_media')
    .insert({
      user_id: userId,
      scene_id: sceneId,
      kind: mediaKindFor(file),
      path,
      position,
    })
    .select()
    .single();
  if (error) {
    await removeObjects(supabase, [path]).catch(() => {});
    throw error;
  }
  return data as SceneMedia;
}

/** Detach a media item and delete its stored object (object best-effort). */
export async function removeSceneMediaItem(
  supabase: SupabaseClient,
  media: SceneMedia,
): Promise<void> {
  const { error } = await supabase.from('scene_media').delete().eq('id', media.id);
  if (error) throw error;
  await removeObjects(supabase, [media.path]).catch(() => {});
}

/**
 * Persist a new media order as a single atomic upsert, renumbering positions
 * from 0 (the persistOrder pattern). Full rows are sent because the insert
 * half of an upsert must satisfy the NOT NULL columns.
 */
export async function persistMediaOrder(
  supabase: SupabaseClient,
  ordered: SceneMedia[],
): Promise<void> {
  if (ordered.length === 0) return;
  const rows = ordered.map((m, i) => ({
    id: m.id,
    user_id: m.user_id,
    scene_id: m.scene_id,
    kind: m.kind,
    path: m.path,
    position: i,
  }));
  const { error } = await supabase.from('scene_media').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
