import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaKind } from './types';
import { SCENE_IMAGES_BUCKET } from './types';
import { uid } from './uid';

const EXT_FROM_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
};

const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg']);

function extFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  return EXT_FROM_MIME[file.type] ?? (fromName || 'bin');
}

/** Classify a picked file as image, video or audio (mime first, ext fallback). */
export function mediaKindFor(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  const ext = extFor(file);
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return 'image';
}

/**
 * Upload a file to `{userId}/{sceneId}/{uuid}.{ext}` and return the object path.
 * Each upload gets a fresh uuid so replacing never collides with a cached path.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${sceneId}/${uid()}.${extFor(file)}`;
  const { error } = await supabase.storage
    .from(SCENE_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Upload any media file (image or video) to a scene/post's folder. Same path
 * convention as uploadImage — the name only differs to read honestly at post
 * call sites now that the bucket holds videos too.
 */
export async function uploadMedia(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  file: File,
): Promise<string> {
  return uploadImage(supabase, userId, sceneId, file);
}

/** Remove one or more objects by path. Safe to call with an empty list. */
export async function removeObjects(supabase: SupabaseClient, paths: string[]): Promise<void> {
  const real = paths.filter(Boolean);
  if (real.length === 0) return;
  const { error } = await supabase.storage.from(SCENE_IMAGES_BUCKET).remove(real);
  if (error) throw error;
}

/**
 * Remove every object under a scene's folder ({userId}/{sceneId}/...), so a
 * deleted scene leaves no orphaned images behind even if replaces piled up.
 */
export async function removeSceneFolder(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
): Promise<void> {
  const prefix = `${userId}/${sceneId}`;
  const PAGE = 1000;
  const paths: string[] = [];
  // list() caps at 100 rows by default — page through so a folder that
  // accumulated many objects is fully cleared.
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(SCENE_IMAGES_BUCKET)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    paths.push(...data.map((o) => `${prefix}/${o.name}`));
    if (data.length < PAGE) break;
  }
  await removeObjects(supabase, paths);
}

/**
 * Create signed display URLs for a batch of object paths. Used for the private
 * bucket — only the owner (via RLS) can mint these.
 */
export async function signImageUrls(
  supabase: SupabaseClient,
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(SCENE_IMAGES_BUCKET)
    .createSignedUrls(unique, expiresInSeconds);
  if (error) throw error;

  const map: Record<string, string> = {};
  // Key by the row's own authoritative path, not array position, so a reorder
  // or partial sign-failure in the response can't misalign URLs to scenes.
  (data ?? []).forEach((row) => {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  });
  return map;
}

/**
 * Mint a short-lived signed URL that forces a download (sets a
 * `Content-Disposition: attachment` header) with the given filename, so the
 * browser saves the file instead of navigating to it. Works for the private
 * bucket without any CORS/blob handling.
 */
export async function signImageDownloadUrl(
  supabase: SupabaseClient,
  path: string,
  filename: string,
  expiresInSeconds = 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SCENE_IMAGES_BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: filename });
  if (error) throw error;
  return data.signedUrl;
}
