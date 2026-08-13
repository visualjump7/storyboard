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
  /** Merchandise: anyone with the link can read these. */
  sale_price: number | null;
  dev_time: string;
  created_at: string;
  media: SharedMedia[];
  /** Merchandise: cheapest quoted unit cost, or null if nothing is quoted. */
  best_cost: number | null;
  quote_count: number;
  order_count: number;
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
      'id, order_index, name, description, copy, status, scheduled_at, platforms, image_path, sale_price, dev_time, created_at',
    )
    .eq('project_id', project.id)
    .order('order_index', { ascending: true });
  if (scenesError) throw scenesError;

  const sceneRows = (scenes ?? []) as Omit<
    SharedScene,
    'media' | 'best_cost' | 'quote_count' | 'order_count'
  >[];
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

  // Merchandise: summarise quotes/orders rather than exposing supplier names
  // and contacts on a public link — the shared board shows the numbers, not
  // who to call.
  const bestCost: Record<string, number | null> = {};
  const quoteCount: Record<string, number> = {};
  const orderCount: Record<string, number> = {};
  if (project.kind === 'merchandise' && sceneIds.length > 0) {
    const { data: quotes, error: quotesError } = await admin
      .from('merch_quotes')
      .select('scene_id, unit_cost')
      .in('scene_id', sceneIds);
    if (quotesError) throw quotesError;
    for (const q of (quotes ?? []) as { scene_id: string; unit_cost: number | null }[]) {
      quoteCount[q.scene_id] = (quoteCount[q.scene_id] ?? 0) + 1;
      if (q.unit_cost === null) continue;
      const seen = bestCost[q.scene_id];
      if (seen === undefined || seen === null || q.unit_cost < seen) {
        bestCost[q.scene_id] = q.unit_cost;
      }
    }

    const { data: orders, error: ordersError } = await admin
      .from('merch_orders')
      .select('scene_id')
      .in('scene_id', sceneIds);
    if (ordersError) throw ordersError;
    for (const o of (orders ?? []) as { scene_id: string }[]) {
      orderCount[o.scene_id] = (orderCount[o.scene_id] ?? 0) + 1;
    }
  }

  const allPaths = [
    ...sceneRows.map((s) => s.image_path).filter((p): p is string => Boolean(p)),
    ...mediaRows.map((m) => m.path),
  ];
  // Service role bypasses storage RLS, so one batch call signs everything.
  const signedUrls = await signImageUrls(admin, allPaths, 3600);

  return {
    project: project as SharedProjectData['project'],
    scenes: sceneRows.map((s) => ({
      ...s,
      media: mediaByScene[s.id] ?? [],
      best_cost: bestCost[s.id] ?? null,
      quote_count: quoteCount[s.id] ?? 0,
      order_count: orderCount[s.id] ?? 0,
    })),
    signedUrls,
  };
}
