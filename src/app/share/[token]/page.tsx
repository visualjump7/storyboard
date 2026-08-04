import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShareView } from '@/components/ShareView';
import { fetchSharedProject } from '@/lib/share';

// Token lookup + fresh signed URLs on every request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shared board',
  robots: { index: false, follow: false },
};

/**
 * Public read-only review page. Reached only by an unguessable share token;
 * exempt from the auth middleware. Renders no auth UI and no links into the
 * app — reviewers see the work, nothing else.
 */
export default async function SharePage({ params }: { params: { token: string } }) {
  const shared = await fetchSharedProject(params.token);
  if (!shared) notFound();

  const { project, scenes, signedUrls } = shared;

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="flex h-[60px] items-center gap-[11px] border-b border-line bg-surface px-[22px]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas">
          S
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">{project.name}</span>
        <span
          className={[
            'inline-flex h-[18px] items-center rounded px-1.5 text-[9.5px] font-semibold uppercase tracking-wide',
            project.kind === 'social'
              ? 'bg-accent/15 text-accent'
              : 'border border-line-2 bg-field text-muted',
          ].join(' ')}
        >
          {project.kind === 'social' ? 'Social' : 'Storyboard'}
        </span>
        <div className="flex-1" />
        <span className="text-[12px] text-muted">Shared board · read-only</span>
      </div>

      <ShareView kind={project.kind} scenes={scenes} urls={signedUrls} />
    </div>
  );
}
