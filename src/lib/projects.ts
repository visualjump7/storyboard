import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, ProjectKind } from './types';
import { removeSceneFolder } from './storage';

// A non-uuid id in eq() raises a 22P02 cast error — treat it as not-found so
// the route can 404 instead of 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch the user's projects in display order. Scoped to one workspace when
 * `workspaceId` is given — every board's project switcher passes its own
 * workspace so a Phantom Ranch board never lists Roaring Pines projects.
 * `workspaceId: null` fetches unfiled projects only.
 */
export async function fetchProjects(
  supabase: SupabaseClient,
  opts: { workspaceId?: string | null } = {},
): Promise<Project[]> {
  let query = supabase.from('projects').select('*');
  if (opts.workspaceId === null) query = query.is('workspace_id', null);
  else if (opts.workspaceId !== undefined) query = query.eq('workspace_id', opts.workspaceId);
  const { data, error } = await query
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Project[];
}

/** Fetch a single project by id, or null if it doesn't exist / isn't the user's. */
export async function fetchProject(
  supabase: SupabaseClient,
  id: string,
): Promise<Project | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

/**
 * Next free position at the end of a workspace's project list: one past the
 * highest index in use. Not COUNT — delete a middle row and COUNT hands out an
 * index that is already taken.
 */
async function nextOrderIndex(supabase: SupabaseClient, workspaceId: string): Promise<number> {
  const { data, error } = await supabase
    .from('projects')
    .select('order_index')
    .eq('workspace_id', workspaceId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.order_index as number) + 1 : 0;
}

/**
 * Create a project inside a workspace, at the end of that workspace's list.
 * `workspaceId` is required: a project with no workspace would be reachable
 * only from the "Unfiled" bucket, and nothing should create one on purpose.
 */
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  name: string,
  kind: ProjectKind = 'storyboard',
): Promise<Project> {
  const order_index = await nextOrderIndex(supabase, workspaceId);
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      name: name.trim() || 'Untitled project',
      kind,
      order_index,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Rename a project. updated_at is set by hand — the schema has no triggers. */
export async function renameProject(
  supabase: SupabaseClient,
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ name: name.trim() || 'Untitled project', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * File a project under a different workspace, appended to the end of that
 * workspace's list. Touches only workspace_id and order_index — never
 * share_token (existing review links must survive a move) and never Storage
 * (object paths carry no workspace segment).
 */
export async function moveProject(
  supabase: SupabaseClient,
  id: string,
  workspaceId: string,
): Promise<void> {
  const order_index = await nextOrderIndex(supabase, workspaceId);
  const { error } = await supabase
    .from('projects')
    .update({ workspace_id: workspaceId, order_index, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Persist a new order for the projects of ONE workspace.
 *
 * Deliberately plain per-row UPDATEs rather than an upsert. An upsert's insert
 * half would resurrect a project deleted elsewhere moments earlier — complete
 * with a fresh share_token, since that column defaults — and a client holding
 * a stale list could silently re-file a project into another workspace. Every
 * update here is pinned to the workspace being reordered, so a row that has
 * moved or vanished is simply left alone.
 */
export async function persistProjectOrder(
  supabase: SupabaseClient,
  workspaceId: string,
  ordered: Project[],
): Promise<void> {
  if (ordered.length === 0) return;
  const stamp = new Date().toISOString();
  const results = await Promise.all(
    ordered.map((p, i) =>
      supabase
        .from('projects')
        .update({ order_index: i, updated_at: stamp })
        .eq('id', p.id)
        .eq('workspace_id', workspaceId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/**
 * Delete a project and everything under it. The DB cascade removes the project's
 * scene + script ROWS, but Storage objects live outside Postgres — so we first
 * clear each scene's image folder, then delete the project.
 */
export async function deleteProject(supabase: SupabaseClient, project: Project): Promise<void> {
  const { data: scenes, error: listErr } = await supabase
    .from('scenes')
    .select('id, user_id')
    .eq('project_id', project.id);
  if (listErr) throw listErr;

  for (const s of scenes ?? []) {
    await removeSceneFolder(supabase, s.user_id as string, s.id as string).catch(() => {});
  }

  const { error } = await supabase.from('projects').delete().eq('id', project.id);
  if (error) throw error;
}
