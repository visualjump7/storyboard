'use client';

import { useEffect } from 'react';
import type { PostFields, Scene, SceneMedia } from '@/lib/types';
import { StatusBadge } from './PostBadges';
import { ChevronLeft, ChevronRight, Close } from './icons';
import { PostEditor } from './PostEditor';

type PostDetailProps = {
  post: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSaveFields: (id: string, fields: Partial<PostFields>) => void;
  onAddMedia: (post: Scene, files: File[]) => void;
  onRemoveMedia: (post: Scene, media: SceneMedia) => void;
  onReorderMedia: (post: Scene, ordered: SceneMedia[]) => void;
  onDelete: (post: Scene) => void;
};

export function PostDetail({
  post,
  media,
  mediaUrls,
  uploading,
  onClose,
  onPrev,
  onNext,
  onSaveFields,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onDelete,
}: PostDetailProps) {
  // Keyboard: ← / → step posts, Esc closes. Arrows are ignored while typing in
  // a field (SELECT included, so the status picker's arrows don't navigate);
  // Esc always closes — unless the media lightbox swallowed it first.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(6,6,8,0.72)] backdrop-blur-[3px]" />

      <div className="absolute bottom-0 right-0 top-0 flex w-[560px] max-w-[92vw] flex-col border-l border-[#2a2a32] bg-surface shadow-slideover">
        {/* Header */}
        <div className="flex h-[60px] flex-none items-center gap-3 border-b border-[#24242b] px-5">
          <StatusBadge status={post.status} />
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <HeaderButton label="Previous post" onClick={onPrev}>
              <ChevronLeft size={16} />
            </HeaderButton>
            <HeaderButton label="Next post" onClick={onNext}>
              <ChevronRight size={16} />
            </HeaderButton>
            <div className="mx-1 h-[22px] w-px bg-[#2c2c34]" />
            <HeaderButton label="Close" onClick={onClose} hoverWhite>
              <Close size={16} />
            </HeaderButton>
          </div>
        </div>

        {/* Body — keyed so navigating posts resets the form cleanly. */}
        <PostEditor
          key={post.id}
          post={post}
          media={media}
          mediaUrls={mediaUrls}
          uploading={uploading}
          onSaveFields={onSaveFields}
          onAddMedia={onAddMedia}
          onRemoveMedia={onRemoveMedia}
          onReorderMedia={onReorderMedia}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function HeaderButton({
  label,
  onClick,
  hoverWhite,
  children,
}: {
  label: string;
  onClick: () => void;
  hoverWhite?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e2e38] bg-[#1d1d23] text-[#c4c4cc] transition-colors hover:bg-[#26262e]',
        hoverWhite ? 'bg-transparent hover:text-white' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
