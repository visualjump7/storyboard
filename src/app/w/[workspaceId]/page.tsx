import { notFound, redirect } from 'next/navigation';
import { ProjectsHome } from '@/components/ProjectsHome';
import { fetchProjects } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { fetchWorkspace, fetchWorkspaces } from '@/lib/workspaces';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

/** One workspace: its projects, and nothing from any other workspace. */
export default async function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RLS guarantees this returns null for a workspace that isn't the user's.
  const workspace = await fetchWorkspace(supabase, params.workspaceId);
  if (!workspace) notFound();

  const [projects, workspaces] = await Promise.all([
    fetchProjects(supabase, { workspaceId: workspace.id }),
    fetchWorkspaces(supabase),
  ]);

  // For social pipelines, surface each project's next upcoming post date —
  // scoped to this workspace's projects so nothing leaks across.
  const nextScheduled: Record<string, string> = {};
  const socialIds = projects.filter((p) => p.kind === 'social').map((p) => p.id);
  if (socialIds.length > 0) {
    const { data } = await supabase
      .from('scenes')
      .select('project_id, scheduled_at')
      .in('project_id', socialIds)
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    for (const row of data ?? []) {
      const pid = row.project_id as string;
      if (!(pid in nextScheduled)) nextScheduled[pid] = row.scheduled_at as string;
    }
  }

  return (
    <ProjectsHome
      key={workspace.id}
      userId={user.id}
      workspace={workspace}
      workspaces={workspaces}
      initialProjects={projects}
      nextScheduled={nextScheduled}
    />
  );
}
