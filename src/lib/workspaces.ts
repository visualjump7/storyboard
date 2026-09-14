import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workspace } from './types';

// A non-uuid id in eq() raises a 22P02 cast error — treat it as not-found so
// the route can 404 instead of 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** All of the user's workspaces in index order, oldest first as a tiebreak. */
export async function fetchWorkspaces(supabase: SupabaseClient): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

/** One workspace by id, or null if it doesn't exist / isn't the user's (RLS). */
export async function fetchWorkspace(
  supabase: SupabaseClient,
  id: string,
): Promise<Workspace | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Workspace) ?? null;
}

/**
 * Create a workspace at the end of the index — one past the highest index in
 * use, not COUNT, so a gap left by a deletion never hands out a taken slot.
 */
export async function createWorkspace(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<Workspace> {
  const { data: last, error: lastErr } = await supabase
    .from('workspaces')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      user_id: userId,
      name: name.trim() || 'Untitled workspace',
      order_index: last ? (last.order_index as number) + 1 : 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

/** Rename a workspace. updated_at is set by hand — the schema has no triggers. */
export async function renameWorkspace(
  supabase: SupabaseClient,
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update({ name: name.trim() || 'Untitled workspace', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** How many projects a workspace holds — deletion is refused unless zero. */
export async function countWorkspaceProjects(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete an EMPTY workspace. Refuses while any project is still filed under
 * it: the FK is ON DELETE NO ACTION, and even if it cascaded, Postgres cannot
 * delete Storage objects — so the only safe order is projects first (each of
 * which sweeps its own Storage), then the workspace.
 */
export async function deleteWorkspace(supabase: SupabaseClient, id: string): Promise<void> {
  const remaining = await countWorkspaceProjects(supabase, id);
  if (remaining > 0) {
    throw new Error(
      `This workspace still holds ${remaining} project${remaining === 1 ? '' : 's'}. ` +
        'Move or delete them first.',
    );
  }
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) throw error;
}
