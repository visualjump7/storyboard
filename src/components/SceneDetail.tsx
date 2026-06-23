'use client';

import { useEffect } from 'react';
import type { Scene, SceneTextFields } from '@/lib/types';
import { ChevronLeft, ChevronRight, Close } from './icons';
import { SceneEditor } from './SceneEditor';

type SceneDetailProps = {
  scene: Scene;
  number: number;
  imageUrl?: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSaveFields: (id: string, fields: SceneTextFields) => void;
  onUploadImage: (scene: Scene, file: File) => Promise<void>;
  onRemoveImage: (scene: Scene) => Promise<void>;
  onDownloadImage: (scene: Scene) => Promise<void>;
  onDelete: (scene: Scene) => void;
};

export function SceneDetail({
  scene,
  number,
  imageUrl,
  onClose,
  onPrev,
  onNext,
  onSaveFields,
  onUploadImage,
  onRemoveImage,
  onDownloadImage,
  onDelete,
}: SceneDetailProps) {
  // Keyboard: ← / → step scenes, Esc closes. Arrows are ignored while typing in
  // a field so the caret can move; Esc always closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
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
          <div className="flex h-6 items-center rounded-md bg-accent px-2.5 text-[12px] font-semibold text-canvas">
            Scene {number}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <HeaderButton label="Previous scene" onClick={onPrev}>
              <ChevronLeft size={16} />
            </HeaderButton>
            <HeaderButton label="Next scene" onClick={onNext}>
              <ChevronRight size={16} />
            </HeaderButton>
            <div className="mx-1 h-[22px] w-px bg-[#2c2c34]" />
            <HeaderButton label="Close" onClick={onClose} hoverWhite>
              <Close size={16} />
            </HeaderButton>
          </div>
        </div>

        {/* Body — keyed so navigating scenes resets the form cleanly. */}
        <SceneEditor
          key={scene.id}
          scene={scene}
          imageUrl={imageUrl}
          onSaveFields={onSaveFields}
          onUploadImage={onUploadImage}
          onRemoveImage={onRemoveImage}
          onDownloadImage={onDownloadImage}
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
