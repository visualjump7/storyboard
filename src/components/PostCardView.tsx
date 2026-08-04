'use client';

import type { Scene, SceneMedia } from '@/lib/types';
import { formatScheduleTime } from '@/lib/pipeline';
import { PlatformChips, StatusBadge } from './PostBadges';
import { ImagePlaceholder, Play } from './icons';
import { VideoThumb } from './VideoThumb';

type PostCardViewProps = {
  post: Scene;
  /** undefined while the media map is still loading (renders a plain well). */
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
  /** Show the schedule time chip (used on scheduled-section cards). */
  showTime?: boolean;
};

/**
 * Presentational body of a post card (media well + status badge + text).
 * The wrapper supplies the card chrome, width, and click/drag behavior.
 */
export function PostCardView({ post, media, mediaUrls, showTime }: PostCardViewProps) {
  const name = post.name || 'Untitled post';
  const copyPreview = post.copy || 'No copy yet';
  const first = media?.[0];
  const firstUrl = first ? mediaUrls[first.path] : undefined;
  const time = showTime && post.scheduled_at ? formatScheduleTime(post.scheduled_at) : '';

  return (
    <>
      <div className="relative aspect-video w-full bg-well">
        {media !== undefined && media.length === 0 && (
          <div className="absolute inset-0 m-2 flex flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2f2f38] text-[#5a5a63]">
            <ImagePlaceholder size={26} />
            <span className="text-[11.5px]">No media yet</span>
          </div>
        )}
        {first && first.kind === 'image' && firstUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstUrl} alt={name} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {first && first.kind === 'video' && (
          <>
            <VideoThumb url={firstUrl} path={first.path} />
            <div className="absolute bottom-[9px] left-[9px] flex h-[22px] w-[22px] items-center justify-center rounded-md border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur">
              <Play size={11} />
            </div>
          </>
        )}

        <div className="absolute left-[9px] top-[9px]">
          <StatusBadge status={post.status} />
        </div>

        {media !== undefined && media.length > 1 && (
          <div className="absolute bottom-[9px] right-[9px] flex h-[22px] items-center rounded-md border border-[#34343c] bg-[rgba(12,12,14,0.78)] px-[8px] text-[11px] font-medium text-[#d0d0d6] backdrop-blur">
            +{media.length - 1}
          </div>
        )}
      </div>

      <div className="px-[13px] pb-[13px] pt-3">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-bright">
          {name}
        </div>
        <div className="mt-1 line-clamp-1 text-[12px] leading-[1.45] text-subtle">{copyPreview}</div>
        {(post.platforms.length > 0 || time) && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <PlatformChips platforms={post.platforms} />
            {time && <span className="flex-none text-[11px] text-muted">{time}</span>}
          </div>
        )}
      </div>
    </>
  );
}
