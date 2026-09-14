import { notFound, redirect } from 'next/navigation';
import { MerchCatalog } from '@/components/MerchCatalog';
import { PostPipeline } from '@/components/PostPipeline';
import { ShowcaseCatalog } from '@/components/ShowcaseCatalog';
import { Storyboard } from '@/components/Storyboard';
import { fetchProject, fetchProjects } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { fetchWorkspace, fetchWorkspaces } from '@/lib/workspaces';

// Reads cookies for auth, so it must render per-request (never prerendered).
export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RLS guarantees this returns null for a project that isn't the user's.
  // The URL is the bare project id — unchanged by the workspace layer, so
  // every bookmark and every camera-reference return link still resolves.
  const project = await fetchProject(supabase, params.projectId);
  if (!project) notFound();

  // The workspace for the breadcrumb, its projects (this one's siblings) for
  // the switcher, and the full workspace list so the other worlds are one click
  // away. Fetched once here on the server so every board surface shows the
  // same scoped list — a Phantom Ranch board never lists Roaring Pines
  // projects. An unfiled project has no workspace and no siblings.
  const [workspace, siblings, workspaces] = await Promise.all([
    project.workspace_id ? fetchWorkspace(supabase, project.workspace_id) : Promise.resolve(null),
    fetchProjects(supabase, { workspaceId: project.workspace_id }),
    fetchWorkspaces(supabase),
  ]);

  const shared = { userId: user.id, project, workspace, siblings, workspaces };

  // Same route, four surfaces chosen by kind; the storyboard is the fallback.
  if (project.kind === 'social') return <PostPipeline {...shared} />;
  if (project.kind === 'merchandise') return <MerchCatalog {...shared} />;
  if (project.kind === 'game' || project.kind === 'music') {
    return <ShowcaseCatalog kind={project.kind} {...shared} />;
  }
  return <Storyboard {...shared} />;
}
