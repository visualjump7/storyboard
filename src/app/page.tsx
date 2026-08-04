import { redirect } from 'next/navigation';
import { ProjectsHome } from '@/components/ProjectsHome';
import { fetchProjects } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const projects = await fetchProjects(supabase);

  // For social pipelines, surface each project's next upcoming post date.
  let nextScheduled: Record<string, string> = {};
  if (projects.some((p) => p.kind === 'social')) {
    const { data } = await supabase
      .from('scenes')
      .select('project_id, scheduled_at')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    for (const row of data ?? []) {
      const pid = row.project_id as string;
      if (!(pid in nextScheduled)) nextScheduled[pid] = row.scheduled_at as string;
    }
  }

  return (
    <ProjectsHome userId={user.id} initialProjects={projects} nextScheduled={nextScheduled} />
  );
}
