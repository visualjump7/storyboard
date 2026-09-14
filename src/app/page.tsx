import { redirect } from 'next/navigation';
import { WorkspacesHome } from '@/components/WorkspacesHome';
import { fetchProjects } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { fetchWorkspaces } from '@/lib/workspaces';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

/** The top level: every workspace, plus any project not yet filed under one. */
export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [workspaces, projects] = await Promise.all([
    fetchWorkspaces(supabase),
    fetchProjects(supabase),
  ]);

  return (
    <WorkspacesHome
      userId={user.id}
      initialWorkspaces={workspaces}
      // Only what the index needs: counts and kind chips per workspace, and
      // the unfiled list. Full project rows stay on the workspace page.
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        workspace_id: p.workspace_id,
      }))}
    />
  );
}
