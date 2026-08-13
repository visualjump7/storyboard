import type { MediaKind, PostStatus, ProjectKind } from './types';
import { createAdminClient } from './supabase/admin';
import { signImageUrls } from './storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Media item as exposed to the public share page (no user_id). */
export interface SharedMedia {
  id: string;
  scene_id: string;
  kind: MediaKind;
  path: string;
  position: number;
}

/**
 * Scene/post as exposed to the public share page. Deliberately excludes
 * user_id and the generation `prompt` — reviewers see the work, not the
 * internals.
 */
export interface SharedScene {
  id: string;
  order_index: number;
  name: string;
  description: string;
  copy: string;
  status: PostStatus;
  scheduled_at: string | null;
  platforms: string[];
  image_path: string | null;
  /** Merchandise: sourcing detail. Anyone with the link can read these. */
  supplier_url: string;
  cost: number | null;
  sale_price: number | null;
  dev_time: string;
  created_at: string;
  media: SharedMedia[];
}

export interface SharedProjectData {
  project: { id: string; name: string; description: string; kind: ProjectKind };
  scenes: SharedScene[];
  /** path -> signed URL (1h) for every image_path and media path. */
  signedUrls: Record<string, string>;
}

/**
 * Resolve a share token to a read-only snapshot of its project. Returns null
 * for a malformed or unknown token (the page turns that into a 404).
 * Server-only: uses the service-role client.
 */
export async function fetchSharedProject(token: string): Promise<SharedProjectData | null> {
  // A non-uuid string in eq() would raise a 22P02 cast error — treat it as
  // not-found instead of surfacing a 500.
  if (!UUID_RE.test(token)) return null;

  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, name, description, kind')
    .eq('share_token', token)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return null;

  const { data: scenes, error: scenesError } = await admin
    .from('scenes')
    .select(
      'id, order_index, name, description, copy, status, scheduled_at, platforms, image_path, supplier_url, cost, sale_price, dev_time, created_at',
    )
    .eq('project_id', project.id)
    .order('order_index', { ascending: true });
  if (scenesError) throw scenesError;

  const sceneRows = (scenes ?? []) as Omit<SharedScene, 'media'>[];
  const sceneIds = sceneRows.map((s) => s.id);

  let mediaRows: SharedMedia[] = [];
  if (sceneIds.length > 0) {
    const { data: media, error: mediaError } = await admin
      .from('scene_media')
      .select('id, scene_id, kind, path, position')
      .in('scene_id', sceneIds)
      .order('position', { ascending: true });
    if (mediaError) throw mediaError;
    mediaRows = (media ?? []) as SharedMedia[];
  }

  const mediaByScene: Record<string, SharedMedia[]> = {};
  mediaRows.forEach((m) => {
    (mediaByScene[m.scene_id] ??= []).push(m);
  });

  const allPaths = [
    ...sceneRows.map((s) => s.image_path).filter((p): p is string => Boolean(p)),
    ...mediaRows.map((m) => m.path),
  ];
  // Service role bypasses storage RLS, so one batch call signs everything.
  const signedUrls = await signImageUrls(admin, allPaths, 3600);

  return {
    project: project as SharedProjectData['project'],
    scenes: sceneRows.map((s) => ({ ...s, media: mediaByScene[s.id] ?? [] })),
    signedUrls,
  };
}
