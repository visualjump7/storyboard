import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasCameraReferenceAccess } from '@/lib/camera-reference/access';
import { CameraAccessForm } from '@/components/camera-reference/CameraAccessForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Unlock Camera References · Storyboard', robots: { index: false, follow: false } };

export default async function CameraReferenceUnlockPage({ searchParams }: { searchParams: { project?: string; shot?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const project = typeof searchParams.project === 'string' && /^[0-9a-f-]{36}$/i.test(searchParams.project) ? searchParams.project : '';
  const shot = typeof searchParams.shot === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(searchParams.shot) ? searchParams.shot : '';
  if (hasCameraReferenceAccess(user.id)) {
    const next = new URLSearchParams();
    if (project) next.set('project', project);
    if (shot) next.set('shot', shot);
    redirect(`/camera-references${next.size ? `?${next}` : ''}`);
  }
  return <CameraAccessForm project={project} shot={shot} />;
}
