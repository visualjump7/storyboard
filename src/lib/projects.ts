import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from './types';
import { removeSceneFolder } from './storage';

/** Fetch all of the current user's projects, oldest first. */
export async function fetchProjects(supabase: SupabaseClient): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Project[];
}

/** Fetch a single project by id, or null if it doesn't exist / isn't the user's. */
export async function fetchProject(
  supabase: SupabaseClient,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

/** Create a new project for the user. */
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, name: name.trim() || 'Untitled project' })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Rename a project. */
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
