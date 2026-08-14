'use client';

import { useMemo, useState } from 'react';
import type { SharedMedia, SharedScene } from '@/lib/share';
import {
  MERCH_STATUS_LABELS,
  SHOWCASE_META,
  SHOWCASE_STATUS_LABELS,
  asMerchStatus,
  asShowcaseStatus,
  type ProjectKind,
  type ShowcaseKind,
} from '@/lib/types';
import { formatMoney, marginPercent } from '@/lib/merch';
import { splitPipeline, formatScheduleTime } from '@/lib/pipeline';
import { PlatformChips, StatusBadge } from './PostBadges';
import { ChevronLeft, ChevronRight, ImagePlaceholder, Play } from './icons';

type ShareViewProps = {
  kind: ProjectKind;
  scenes: SharedScene[];
  /** path -> signed URL (1h TTL; a long-open tab needs a reload). */
  urls: Record<string, string>;
};

/**
 * Client island for the public share page: the pipeline grouping runs in the
 * viewer's timezone and the media carousels need local state. Read-only — no
 * mutations, no links into the app.
 */
export function ShareView({ kind, scenes, urls }: ShareViewProps) {
  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-32 text-[13px] text-muted">
        Nothing here yet.
      </div>
    );
  }
  if (kind === 'social') return <SocialShare scenes={scenes} urls={urls} />;
  if (kind === 'merchandise') return <MerchShare scenes={scenes} urls={urls} />;
  if (kind === 'game' || kind === 'music') {
    return <ShowcaseShare kind={kind} scenes={scenes} urls={urls} />;
  }
  return <StoryboardShare scenes={scenes} urls={urls} />;
}

// ---------------------------------------------------------------------------
// Games / music: cover, summary, playable media, and a link out
// ---------------------------------------------------------------------------

function ShowcaseShare({
  kind,
  scenes,
  urls,
}: {
  kind: ShowcaseKind;
  scenes: SharedScene[];
  urls: Record<string, string>;
}) {
  const meta = SHOWCASE_META[kind];
  return (
    <div className="mx-auto max-w-[1180px] px-[26px] pb-24 pt-8">
      <div className="flex flex-wrap content-start gap-[22px]">
        {scenes.map((item) => {
          const audio = item.media.filter((m) => m.kind === 'audio');
          const visual = item.media.filter((m) => m.kind !== 'audio');
          const link = item.link_url?.trim() ?? '';
          const linkIsHttp = /^https?:\/\//i.test(link);
          return (
            <div
              key={item.id}
              className="w-[340px] max-w-full flex-none overflow-hidden rounded-xl border border-line bg-card shadow-card"
            >
              {/* An audio-only track has media, just nothing to show — the
                  player below carries it, so skip the empty-looking well. */}
              {(visual.length > 0 || audio.length === 0) && (
                <MediaCarousel
                  media={visual}
                  urls={urls}
                  alt={item.name || meta.noun.one}
                  statusBadge={
                    <span className="flex h-[20px] items-center rounded border border-[#32323c] bg-[rgba(12,12,14,0.82)] px-1.5 text-[9.5px] font-medium uppercase tracking-wide text-[#b4b4be] backdrop-blur">
                      {SHOWCASE_STATUS_LABELS[asShowcaseStatus(kind, item.status)]}
                    </span>
                  }
                />
              )}
              <div className="px-4 pb-4 pt-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em] text-bright">
                    {item.name || `Untitled ${meta.noun.one}`}
                  </span>
                  {visual.length === 0 && audio.length > 0 && (
                    <span className="flex h-[20px] flex-none items-center rounded border border-[#32323c] bg-[#22222a] px-1.5 text-[9.5px] font-medium uppercase tracking-wide text-[#b4b4be]">
                      {SHOWCASE_STATUS_LABELS[asShowcaseStatus(kind, item.status)]}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#cfcfd4]">
                    {item.description}
                  </p>
                )}
                {audio.map((track) =>
                  urls[track.path] ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio
                      key={track.id}
                      controls
                      preload="metadata"
                      src={urls[track.path]}
                      className="mt-3 w-full"
                    />
                  ) : null,
                )}
                {link && linkIsHttp && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 text-[12.5px] font-medium text-accent transition-opacity hover:opacity-80"
                  >
                    {meta.openLabel} ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Merchandise: one row per product, stage + numbers
// ---------------------------------------------------------------------------

function MerchShare({ scenes, urls }: { scenes: SharedScene[]; urls: Record<string, string> }) {
  return (
    <div className="mx-auto max-w-[1100px] px-[26px] pb-24 pt-8">
      <div className="flex flex-col gap-2.5">
        {scenes.map((item) => {
          const cover = item.media.find((m) => m.kind === 'image');
          const coverUrl = cover ? urls[cover.path] : undefined;
          const pct = marginPercent(item.best_cost, item.sale_price);
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-line bg-card shadow-card"
            >
              <div className="flex items-center gap-3.5 px-3.5 py-3">
                <div className="h-[44px] w-[44px] flex-none overflow-hidden rounded-lg bg-[#15151a]">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#4a4a54]">
                      <ImagePlaceholder size={18} />
                    </div>
                  )}
                </div>

                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-bright">
                  {item.name || 'Untitled product'}
                </span>

                <span className="hidden flex-none items-center gap-1.5 text-[12px] sm:flex">
                  <span className="text-muted">{formatMoney(item.best_cost)}</span>
                  <span className="text-[#3a3a44]">→</span>
                  <span className="text-ink">{formatMoney(item.sale_price)}</span>
                  {pct !== null && (
                    <span className={pct >= 0 ? 'text-[#6ec08a]' : 'text-[#c96a6a]'}>
                      {pct >= 0 ? '+' : ''}
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </span>

                <span className="hidden flex-none text-[11.5px] text-muted md:block">
                  {item.quote_count} quote{item.quote_count === 1 ? '' : 's'} ·{' '}
                  {item.order_count} order{item.order_count === 1 ? '' : 's'}
                </span>

                <span className="flex h-[22px] flex-none items-center rounded border border-[#32323c] bg-[#22222a] px-2 text-[10.5px] font-medium uppercase tracking-wide text-[#b4b4be]">
                  {MERCH_STATUS_LABELS[asMerchStatus(item.status)]}
                </span>
              </div>

              {(item.description || item.dev_time) && (
                <div className="border-t border-[#24242b] px-3.5 py-2.5">
                  {item.description && (
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">
                      {item.description}
                    </p>
                  )}
                  {item.dev_time && (
                    <p className="mt-1 text-[11.5px] text-[#54545e]">
                      Development time: {item.dev_time}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social: backlog + date groups, full copy, media carousels
// ---------------------------------------------------------------------------

function SocialShare({ scenes, urls }: { scenes: SharedScene[]; urls: Record<string, string> }) {
  const { backlog, groups } = useMemo(() => splitPipeline(scenes), [scenes]);

  return (
    <div className="mx-auto max-w-[1180px] px-[26px] pb-24 pt-8">
      <SectionHeader>
        Backlog
        <span className="ml-2 font-normal normal-case tracking-normal text-[#54545e]">
          {backlog.length}
        </span>
      </SectionHeader>
      {backlog.length === 0 ? (
        <p className="mb-2 text-[12.5px] text-muted">Backlog is empty.</p>
      ) : (
        <div className="flex flex-wrap content-start gap-[22px]">
          {backlog.map((post) => (
            <ShareCard key={post.id} post={post} urls={urls} />
          ))}
        </div>
      )}

      <SectionHeader className="mt-10">Scheduled</SectionHeader>
      {groups.length === 0 ? (
        <p className="text-[12.5px] text-muted">Nothing scheduled yet.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`text-[12.5px] font-semibold ${group.isPast ? 'text-[#c96a6a]' : 'text-bright'}`}
              >
                {group.label}
              </span>
              {group.isPast && (
                <span className="flex h-[17px] items-center rounded border border-[#4a2a30] bg-[#251618] px-1.5 text-[9.5px] uppercase tracking-wide text-[#c96a6a]">
                  Past
                </span>
              )}
            </div>
            <div className="flex flex-wrap content-start gap-[22px]">
              {group.posts.map((post) => (
                <ShareCard key={post.id} post={post} urls={urls} showTime />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ShareCard({
  post,
  urls,
  showTime,
}: {
  post: SharedScene;
  urls: Record<string, string>;
  showTime?: boolean;
}) {
  const time = showTime && post.scheduled_at ? formatScheduleTime(post.scheduled_at) : '';
  return (
    <div className="w-[340px] max-w-full flex-none overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <MediaCarousel media={post.media} urls={urls} alt={post.name || 'Post media'} statusBadge={<StatusBadge status={post.status} />} />
      <div className="px-4 pb-4 pt-3">
        <div className="text-[14.5px] font-semibold tracking-[-0.01em] text-bright">
          {post.name || 'Untitled post'}
        </div>
        {post.copy ? (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#cfcfd4]">
            {post.copy}
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] italic text-muted">No copy yet</p>
        )}
        {(post.platforms.length > 0 || time) && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <PlatformChips platforms={post.platforms} />
            {time && <span className="flex-none text-[11px] text-muted">{time}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCarousel({
  media,
  urls,
  alt,
  statusBadge,
}: {
  media: SharedMedia[];
  urls: Record<string, string>;
  alt: string;
  statusBadge?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const count = media.length;
  const current = count > 0 ? media[Math.min(index, count - 1)] : null;
  const url = current ? urls[current.path] : undefined;

  return (
    <div className="relative aspect-video w-full bg-well">
      {!current && (
        <div className="absolute inset-0 m-2 flex flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2f2f38] text-[#5a5a63]">
          <ImagePlaceholder size={26} />
          <span className="text-[11.5px]">No media</span>
        </div>
      )}

      {current && current.kind === 'image' && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      )}

      {current && current.kind === 'video' && url && !videoFailed[current.id] && (
        <video
          key={current.id}
          controls
          playsInline
          preload="metadata"
          src={`${url}#t=0.001`}
          onError={() => setVideoFailed((f) => ({ ...f, [current.id]: true }))}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {current && current.kind === 'video' && url && videoFailed[current.id] && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#5a5a63]">
          <Play size={22} />
          <span className="text-[10px] uppercase tracking-wide">
            This browser can’t play this format
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] text-muted underline underline-offset-2 hover:text-ink"
          >
            Open file
          </a>
        </div>
      )}

      {statusBadge && <div className="absolute left-[9px] top-[9px]">{statusBadge}</div>}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous media"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next media"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
          >
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Media ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === Math.min(index, count - 1) ? 'bg-accent' : 'bg-[#4a4a54]'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storyboard: simple read-only scene grid
// ---------------------------------------------------------------------------

function StoryboardShare({
  scenes,
  urls,
}: {
  scenes: SharedScene[];
  urls: Record<string, string>;
}) {
  return (
    <div className="mx-auto max-w-[1180px] px-[26px] pb-24 pt-8">
      <div className="flex flex-wrap content-start gap-[22px]">
        {scenes.map((scene, i) => {
          const url = scene.image_path ? urls[scene.image_path] : undefined;
          // A scene can carry rendered clips/extra frames in scene_media
          // alongside its single hero still. When it does, the carousel plays
          // them; the still stays the fallback for scenes without any.
          const badge = (
            <div className="flex h-[22px] items-center rounded-md bg-accent px-[9px] text-[11.5px] font-semibold tracking-[0.01em] text-canvas shadow-badge">
              Scene {i + 1}
            </div>
          );
          return (
            <div
              key={scene.id}
              className="w-[300px] max-w-full flex-none overflow-hidden rounded-xl border border-line bg-card shadow-card"
            >
              {scene.media.length > 0 ? (
                <MediaCarousel
                  media={scene.media}
                  urls={urls}
                  alt={scene.name || `Scene ${i + 1}`}
                  statusBadge={badge}
                />
              ) : (
                <div className="relative aspect-video w-full bg-well">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={scene.name || `Scene ${i + 1}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 m-2 flex flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2f2f38] text-[#5a5a63]">
                      <ImagePlaceholder size={26} />
                      <span className="text-[11.5px]">No image</span>
                    </div>
                  )}
                  <div className="absolute left-[9px] top-[9px]">{badge}</div>
                </div>
              )}
              <div className="px-[13px] pb-[13px] pt-3">
                <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-bright">
                  {scene.name || 'Untitled scene'}
                </div>
                {scene.description && (
                  <div className="mt-1 text-[12px] leading-[1.5] text-subtle">
                    {scene.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
