import type { PostStatus } from '@/lib/types';

/**
 * Status + platform display metadata and badge atoms. No 'use client' — these
 * are pure presentational elements shared by the pipeline board, the post
 * editor, and the server-rendered share page.
 */

export const STATUS_META: Record<PostStatus, { label: string; badgeClass: string }> = {
  // Solid dark fills + tinted text so badges stay legible over card media.
  idea: { label: 'Idea', badgeClass: 'bg-[#232329] text-[#9a9aa4]' },
  draft: { label: 'Draft', badgeClass: 'bg-[#2b2416] text-[#e0b45c]' },
  ready: { label: 'Ready', badgeClass: 'bg-[#16281d] text-[#5cc98a]' },
  scheduled: { label: 'Scheduled', badgeClass: 'bg-[#2b1a10] text-accent' },
  posted: { label: 'Posted', badgeClass: 'bg-[#161d28] text-[#6ca0e0]' },
};

export const PLATFORMS: { slug: string; label: string; short: string }[] = [
  { slug: 'linkedin', label: 'LinkedIn', short: 'IN' },
  { slug: 'instagram', label: 'Instagram', short: 'IG' },
  { slug: 'x', label: 'X', short: 'X' },
  { slug: 'facebook', label: 'Facebook', short: 'FB' },
  { slug: 'tiktok', label: 'TikTok', short: 'TT' },
  { slug: 'youtube', label: 'YouTube', short: 'YT' },
];

export function StatusBadge({ status }: { status: PostStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <div
      className={`flex h-[22px] items-center rounded-md px-[9px] text-[11.5px] font-semibold tracking-[0.01em] shadow-badge ${meta.badgeClass}`}
    >
      {meta.label}
    </div>
  );
}

export function PlatformChips({ platforms }: { platforms: string[] }) {
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {platforms.map((slug) => {
        const meta = PLATFORMS.find((p) => p.slug === slug);
        return (
          <span
            key={slug}
            title={meta?.label ?? slug}
            className="flex h-[18px] items-center rounded border border-line-2 bg-field px-1.5 text-[10px] uppercase tracking-wide text-muted"
          >
            {meta?.short ?? slug.slice(0, 2)}
          </span>
        );
      })}
    </div>
  );
}
