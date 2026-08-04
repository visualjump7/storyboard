import { notFound, redirect } from 'next/navigation';
import { PostPipeline } from '@/components/PostPipeline';
import { Storyboard } from '@/components/Storyboard';
import { fetchProject } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RLS guarantees this returns null for a project that isn't the user's.
  const project = await fetchProject(supabase, params.projectId);
  if (!project) notFound();

  // Same route, two surfaces: social projects get the post pipeline, film
  // projects keep the original storyboard untouched.
  return project.kind === 'social' ? (
    <PostPipeline userId={user.id} project={project} />
  ) : (
    <Storyboard userId={user.id} project={project} />
  );
}
