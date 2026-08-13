'use client';

import { useEffect } from 'react';
import {
  MERCH_STATUS_LABELS,
  asMerchStatus,
  type MerchFields,
  type Scene,
  type SceneMedia,
} from '@/lib/types';
import { ChevronLeft, ChevronRight, Close } from './icons';
import { MerchEditor } from './MerchEditor';

type MerchDetailProps = {
  item: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSaveFields: (id: string, fields: Partial<MerchFields>) => void;
  onAddMedia: (item: Scene, files: File[]) => void;
  onRemoveMedia: (item: Scene, media: SceneMedia) => void;
  onReorderMedia: (item: Scene, ordered: SceneMedia[]) => void;
  onDelete: (item: Scene) => void;
};

export function MerchDetail({
  item,
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
}: MerchDetailProps) {
  // ← / → step items, Esc closes. Arrows are ignored while typing in a field
  // (SELECT included, so the stage picker's arrows don't navigate away).
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

  const stage = asMerchStatus(item.status);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(6,6,8,0.72)] backdrop-blur-[3px]" />

      <div className="absolute bottom-0 right-0 top-0 flex w-[560px] max-w-[92vw] flex-col border-l border-[#2a2a32] bg-surface shadow-slideover">
        <div className="flex h-[60px] flex-none items-center gap-3 border-b border-[#24242b] px-5">
          <span className="flex h-[22px] items-center rounded border border-[#32323c] bg-[#22222a] px-2 text-[10.5px] font-medium uppercase tracking-wide text-[#b4b4be]">
            {MERCH_STATUS_LABELS[stage]}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <HeaderButton label="Previous item" onClick={onPrev}>
              <ChevronLeft size={16} />
            </HeaderButton>
            <HeaderButton label="Next item" onClick={onNext}>
              <ChevronRight size={16} />
            </HeaderButton>
            <div className="mx-1 h-[22px] w-px bg-[#2c2c34]" />
            <HeaderButton label="Close" onClick={onClose} hoverWhite>
              <Close size={16} />
            </HeaderButton>
          </div>
        </div>

        {/* Keyed so navigating between items resets the form cleanly. */}
        <MerchEditor
          key={item.id}
          item={item}
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
