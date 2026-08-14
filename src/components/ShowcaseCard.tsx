'use client';

import {
  SHOWCASE_META,
  SHOWCASE_STATUS_LABELS,
  asShowcaseStatus,
  type Scene,
  type SceneMedia,
  type ShowcaseKind,
} from '@/lib/types';
import { ImagePlaceholder, Play } from './icons';
import { VideoThumb } from './VideoThumb';

type ShowcaseCardProps = {
  kind: ShowcaseKind;
  item: Scene;
  /** undefined = media still loading; [] = loaded and empty. */
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
};

/**
 * The face of a game/track card: cover shot, name, summary, and the stage.
 * The play/listen link is a real anchor so it works from the card itself.
 */
export function ShowcaseCard({ kind, item, media, mediaUrls }: ShowcaseCardProps) {
  const meta = SHOWCASE_META[kind];
  const cover = media?.find((m) => m.kind === 'image') ?? media?.[0];
  const coverUrl = cover ? mediaUrls[cover.path] : undefined;
  const extra = media ? Math.max(0, media.length - 1) : 0;
  const stage = asShowcaseStatus(kind, item.status);
  const link = item.link_url?.trim() ?? '';
  const linkIsHttp = /^https?:\/\//i.test(link);

  return (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-well">
        {cover && cover.kind === 'image' && coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={item.name || 'Cover'}
            className="h-full w-full object-cover"
          />
        )}
        {cover && cover.kind === 'video' && (
          <VideoThumb url={coverUrl} />
        )}
        {cover && cover.kind === 'audio' && (
          <div className="flex h-full w-full items-center justify-center text-[#5a5a63]">
            <Play size={24} />
          </div>
        )}
        {!cover && (
          <div className="m-2 flex h-[calc(100%-16px)] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2f2f38] text-[#5a5a63]">
            <ImagePlaceholder size={24} />
            <span className="text-[11.5px]">{media === undefined ? '' : 'No media'}</span>
          </div>
        )}

        <span className="absolute left-[9px] top-[9px] flex h-[20px] items-center rounded border border-[#32323c] bg-[rgba(12,12,14,0.82)] px-1.5 text-[9.5px] font-medium uppercase tracking-wide text-[#b4b4be] backdrop-blur">
          {SHOWCASE_STATUS_LABELS[stage]}
        </span>

        {extra > 0 && (
          <span className="absolute bottom-2 right-2 rounded bg-[rgba(6,6,8,0.78)] px-1.5 py-0.5 text-[10.5px] text-[#c4c4cc]">
            +{extra}
          </span>
        )}
      </div>

      <div className="px-3.5 py-3">
        <div className="truncate text-[14px] font-medium text-bright">
          {item.name || `Untitled ${meta.noun.one}`}
        </div>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        {link && linkIsHttp && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2.5 inline-flex h-[26px] items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-2.5 text-[12px] font-medium text-accent transition-opacity hover:opacity-80"
          >
            {meta.openLabel} ↗
          </a>
        )}
      </div>
    </>
  );
}
