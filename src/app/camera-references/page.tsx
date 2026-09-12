import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CameraLibrary } from '@/components/camera-reference/CameraLibrary';
import { cameraReferences, categories } from '@/lib/camera-reference/catalog';
import { hasCameraReferenceAccess } from '@/lib/camera-reference/access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Camera References · Storyboard',
  description: 'Explore cinematic techniques, camera paths, framing, and working shot directions.',
  robots: { index: false, follow: false },
};

export default async function CameraReferencesPage({ searchParams }: {
  searchParams: { project?: string; shot?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!hasCameraReferenceAccess(user.id)) {
    const next = new URLSearchParams();
    if (typeof searchParams.project === 'string') next.set('project', searchParams.project);
    if (typeof searchParams.shot === 'string') next.set('shot', searchParams.shot);
    redirect(`/camera-references/unlock${next.size ? `?${next}` : ''}`);
  }
  const projectId = typeof searchParams.project === 'string' && /^[0-9a-f-]{36}$/i.test(searchParams.project)
    ? searchParams.project : undefined;
  return <CameraLibrary projectId={projectId} initialShot={searchParams.shot} cameraReferences={cameraReferences} categories={categories} />;
}
