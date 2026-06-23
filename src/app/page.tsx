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
  return <ProjectsHome userId={user.id} initialProjects={projects} />;
}
