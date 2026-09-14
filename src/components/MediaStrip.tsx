'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signImageDownloadUrl } from '@/lib/storage';
import type { SceneMedia } from '@/lib/types';
import { ChevronLeft, ChevronRight, Close, Download, Play, Plus, Spinner } from './icons';
import { VideoThumb } from './VideoThumb';

type MediaStripProps = {
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (media: SceneMedia) => void;
  onReorder: (ordered: SceneMedia[]) => void;
  /** Base name for downloaded files (e.g. the item's name); defaults to "media". */
  downloadName?: string;
};

const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg)$/i;

/** Filename for a downloaded item: "<slug>-<n>.<ext>". */
function downloadFilename(base: string | undefined, item: SceneMedia, index: number): string {
  const ext = item.path.split('.').pop() || 'bin';
  const slug =
    (base || 'media')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'media';
  return `${slug}-${index + 1}.${ext}`;
}

/**
 * Horizontal media manager for the post editor: add tile (picker + drag-drop),
 * thumbnails with remove/swap-reorder overlays, and a click-to-view lightbox.
 */
export function MediaStrip({
  media,
  mediaUrls,
  uploading,
  onAddFiles,
  onRemove,
  onReorder,
  downloadName,
}: MediaStripProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const [lightbox, setLightbox] = useState<SceneMedia | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function pickFiles(list: FileList | null | undefined) {
    // Audio is accepted too (voice references, tracks). Some audio files reach
    // the browser with an empty MIME type, so fall back to the extension.
    const files = Array.from(list ?? []).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type.startsWith('video/') ||
        f.type.startsWith('audio/') ||
        AUDIO_EXT.test(f.name),
    );
    if (files.length) onAddFiles(files);
  }

  // A signed URL with Content-Disposition: attachment, clicked through a
  // temporary anchor, downloads the original file without leaving the page.
  async function download(item: SceneMedia, index: number) {
    setDownloadError(null);
    try {
      const url = await signImageDownloadUrl(
        supabase,
        item.path,
        downloadFilename(downloadName, item, index),
      );
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Download failed', e);
      setDownloadError('Download failed. Check your connection and try again.');
    }
  }

  function swap(index: number, dir: 1 | -1) {
    const target = index + dir;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-[7px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Media
        </span>
        <span className="text-[10.5px] text-[#52525a]">images, video, or audio — in display order</span>
      </div>
      {downloadError && !lightbox && (
        <p role="alert" className="mb-2 text-[11.5px] text-[#e0a0a0]">
          {downloadError}
        </p>
      )}

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pickFiles(e.dataTransfer.files);
        }}
      >
        {/* Add tile */}
        <button
          type="button"
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          aria-label="Add media"
          className="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-lg border-[1.5px] border-dashed border-[#303039] bg-well text-[#62626c] transition-colors hover:border-[#3a3a44] hover:text-[#a6a6ae] disabled:opacity-60"
        >
          {uploading ? <Spinner size={20} className="animate-spin text-accent" /> : <Plus size={18} />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {media.map((item, index) => {
          const url = mediaUrls[item.path];
          return (
            <div
              key={item.id}
              className="group relative h-[76px] w-[76px] flex-none overflow-hidden rounded-lg border border-line-2 bg-well"
            >
              <button
                type="button"
                onClick={() => setLightbox(item)}
                aria-label={`View media ${index + 1}`}
                className="absolute inset-0"
              >
                {item.kind === 'image' && url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {item.kind === 'video' && (
                  <>
                    <VideoThumb url={url} path={item.path} />
                    <span className="absolute bottom-1 left-1 flex h-[16px] w-[16px] items-center justify-center rounded border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6]">
                      <Play size={8} />
                    </span>
                  </>
                )}
                {item.kind === 'audio' && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#7a7a86]">
                    <Play size={16} />
                    <span className="text-[9px] uppercase tracking-wide">
                      {item.path.split('.').pop()?.slice(0, 4) ?? 'audio'}
                    </span>
                  </span>
                )}
                {!url && item.kind === 'image' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner size={16} className="animate-spin text-[#5a5a63]" />
                  </span>
                )}
              </button>

              {/* Hover overlays: download, remove, swap-reorder */}
              <button
                type="button"
                onClick={() => void download(item, index)}
                aria-label="Download original"
                title="Download original"
                className="absolute left-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded border border-[#34343c] bg-[rgba(12,12,14,0.85)] text-[#d0d0d6] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              >
                <Download size={10} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label="Remove media"
                className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded border border-[#34343c] bg-[rgba(12,12,14,0.85)] text-[#d0d0d6] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              >
                <Close size={10} />
              </button>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => swap(index, -1)}
                  aria-label="Move earlier"
                  className="absolute bottom-1 left-1 flex h-[18px] w-[18px] items-center justify-center rounded border border-[#34343c] bg-[rgba(12,12,14,0.85)] text-[#d0d0d6] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  <ChevronLeft size={11} />
                </button>
              )}
              {index < media.length - 1 && (
                <button
                  type="button"
                  onClick={() => swap(index, 1)}
                  aria-label="Move later"
                  className="absolute bottom-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded border border-[#34343c] bg-[rgba(12,12,14,0.85)] text-[#d0d0d6] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  <ChevronRight size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <Lightbox
          media={lightbox}
          url={mediaUrls[lightbox.path]}
          onClose={() => setLightbox(null)}
          onDownload={() => void download(lightbox, media.findIndex((m) => m.id === lightbox.id))}
          downloadError={downloadError}
        />
      )}
    </div>
  );
}

function Lightbox({
  media,
  url,
  onClose,
  onDownload,
  downloadError,
}: {
  media: SceneMedia;
  url?: string;
  onClose: () => void;
  onDownload: () => void;
  downloadError: string | null;
}) {
  // Capture-phase Escape so closing the lightbox doesn't also close the
  // slide-over behind it (whose listener runs in the bubble phase).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(4,4,6,0.85)] backdrop-blur-[3px]" />
      <button
        type="button"
        onClick={onDownload}
        aria-label="Download original"
        title="Download original"
        className="absolute right-16 top-5 z-[61] flex h-9 items-center gap-1.5 rounded-lg border border-[#2e2e38] bg-[#1d1d23] px-3 text-[12.5px] text-[#c4c4cc] transition-colors hover:bg-[#26262e] hover:text-white"
      >
        <Download size={13} />
        Download
      </button>
      {downloadError && (
        <p
          role="alert"
          className="absolute right-5 top-16 z-[61] rounded-lg border border-[#4a2a30] bg-[#251618] px-3 py-1.5 text-[12px] text-[#e0a0a0]"
        >
          {downloadError}
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-5 top-5 z-[61] flex h-9 w-9 items-center justify-center rounded-lg border border-[#2e2e38] bg-[#1d1d23] text-[#c4c4cc] transition-colors hover:bg-[#26262e] hover:text-white"
      >
        <Close size={16} />
      </button>
      {/* The centering layer sits above the scrim, so it forwards backdrop
          clicks to close; media clicks stopPropagation. */}
      <div onClick={onClose} className="absolute inset-0 flex items-center justify-center p-8">
        {media.kind === 'image' && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-slideover"
            onClick={(e) => e.stopPropagation()}
          />
        ) : media.kind === 'audio' && url ? (
          <audio
            controls
            preload="metadata"
            src={url}
            className="w-[min(560px,85vw)] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        ) : url ? (
          <video
            controls
            playsInline
            preload="metadata"
            src={url}
            className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-slideover"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Spinner size={28} className="animate-spin text-accent" />
        )}
      </div>
    </div>
  );
}
