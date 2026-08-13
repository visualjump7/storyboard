'use client';

import { useMemo, useState } from 'react';
import type { SharedMedia, SharedScene } from '@/lib/share';
import { MERCH_STATUS_LABELS, type ProjectKind, type Scene } from '@/lib/types';
import { formatMoney, groupByStatus, marginPercent } from '@/lib/merch';
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
  return <StoryboardShare scenes={scenes} urls={urls} />;
}

// ---------------------------------------------------------------------------
// Merchandise: stage columns, cover image, and the numbers
// ---------------------------------------------------------------------------

function MerchShare({ scenes, urls }: { scenes: SharedScene[]; urls: Record<string, string> }) {
  const columns = useMemo(() => groupByStatus(scenes as unknown as Scene[]), [scenes]);

  return (
    <div className="mx-auto max-w-[1180px] overflow-x-auto px-[26px] pb-24 pt-8">
      <div className="flex items-start gap-5">
        {columns.map((column) => (
          <section key={column.status} className="flex w-[248px] flex-none flex-col">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                {MERCH_STATUS_LABELS[column.status]}
              </span>
              <span className="text-[11px] text-[#54545e]">{column.items.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {column.items.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#2a2a32] px-3 py-6 text-center text-[12px] text-[#4a4a54]">
                  Nothing here
                </p>
              )}
              {column.items.map((raw) => {
                const item = raw as unknown as SharedScene;
                const cover = item.media.find((m) => m.kind === 'image');
                const coverUrl = cover ? urls[cover.path] : undefined;
                const pct = marginPercent(item);
                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-line bg-card shadow-card"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-[#15151a]">
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt={item.name || 'Merchandise item'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted">
                          <ImagePlaceholder size={26} />
                        </div>
                      )}
                      {item.media.length > 1 && (
                        <span className="absolute bottom-2 right-2 rounded bg-[rgba(6,6,8,0.78)] px-1.5 py-0.5 text-[10.5px] text-[#c4c4cc]">
                          +{item.media.length - 1}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="truncate text-[13px] font-medium text-bright">
                        {item.name || 'Untitled item'}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-2 text-[12px]">
                        <span className="text-muted">{formatMoney(item.cost)}</span>
                        <span className="text-[#3a3a44]">→</span>
                        <span className="text-ink">{formatMoney(item.sale_price)}</span>
                        {pct !== null && (
                          <span
                            className={`ml-auto text-[11.5px] ${pct >= 0 ? 'text-[#6ec08a]' : 'text-[#c96a6a]'}`}
                          >
                            {pct >= 0 ? '+' : ''}
                            {pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {item.dev_time && (
                        <div className="mt-1 truncate text-[11.5px] text-muted">{item.dev_time}</div>
                      )}
                      {item.description && (
                        <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
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
          return (
            <div
              key={scene.id}
              className="w-[300px] max-w-full flex-none overflow-hidden rounded-xl border border-line bg-card shadow-card"
            >
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
                <div className="absolute left-[9px] top-[9px] flex h-[22px] items-center rounded-md bg-accent px-[9px] text-[11.5px] font-semibold tracking-[0.01em] text-canvas shadow-badge">
                  Scene {i + 1}
                </div>
              </div>
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
