'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MutableRefObject } from 'react';
import type { Scene } from '@/lib/types';
import { ImagePlaceholder } from './icons';

type SceneCardProps = {
  scene: Scene;
  number: number;
  cardSize: number;
  imageUrl?: string;
  isOver: boolean;
  /** Shared flag set during/just-after a drag, to suppress the click-to-open. */
  dragGuard: MutableRefObject<boolean>;
  onOpen: (id: string) => void;
};

export function SceneCard({
  scene,
  number,
  cardSize,
  imageUrl,
  isOver,
  dragGuard,
  onOpen,
}: SceneCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });

  const style: React.CSSProperties = {
    width: cardSize,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  const name = scene.name || 'Untitled scene';
  const description = scene.description || 'No description yet';
  // image_path set but URL not signed yet → image is loading.
  const pending = Boolean(scene.image_path) && !imageUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (dragGuard.current) {
          dragGuard.current = false;
          return;
        }
        onOpen(scene.id);
      }}
      className="group relative flex-none cursor-pointer select-none overflow-hidden rounded-xl border border-line bg-card shadow-card transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#3a3a44] hover:shadow-card-hover"
    >
      {isOver && (
        <div className="pointer-events-none absolute inset-0 z-[5] rounded-xl border-2 border-accent shadow-[0_0_0_4px_rgba(255,72,0,0.18)]" />
      )}

      <div className="relative aspect-video w-full bg-well">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 m-2 flex flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2f2f38] text-[#5a5a63]">
            <ImagePlaceholder size={26} />
            <span className="text-[11.5px]">{pending ? 'Loading…' : 'Upload image'}</span>
          </div>
        )}

        <div className="absolute left-[9px] top-[9px] flex h-[22px] items-center rounded-md bg-accent px-[9px] text-[11.5px] font-semibold tracking-[0.01em] text-canvas shadow-badge">
          Scene {number}
        </div>
      </div>

      <div className="px-[13px] pb-[13px] pt-3">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-bright">
          {name}
        </div>
        <div className="mt-1 line-clamp-1 text-[12px] leading-[1.45] text-subtle">{description}</div>
      </div>
    </div>
  );
}
