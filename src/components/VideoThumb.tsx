'use client';

import { useState } from 'react';
import { Play } from './icons';

type VideoThumbProps = {
  /** Signed URL; undefined while signing is in flight (renders a plain well). */
  url?: string;
  /** Object path or URL, used only to label the fallback tile (e.g. "MOV"). */
  path?: string;
};

/**
 * Static first-frame preview of a video. preload="metadata" plus the #t=0.001
 * fragment makes browsers (Safari included) paint frame one without autoplay.
 * Codecs the browser can't decode (.mov/HEVC in Chrome) fall back to a labeled
 * tile instead of a black box.
 */
export function VideoThumb({ url, path }: VideoThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!url) return null;

  if (failed) {
    const ext = (path ?? url).split('?')[0].split('.').pop()?.toUpperCase() ?? '';
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#5a5a63]">
        <Play size={22} />
        <span className="text-[10px] uppercase tracking-wide">
          Video{ext && ext.length <= 4 ? ` · ${ext}` : ''}
        </span>
      </div>
    );
  }

  return (
    <video
      muted
      playsInline
      preload="metadata"
      src={`${url}#t=0.001`}
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
