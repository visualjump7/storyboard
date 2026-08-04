'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type MutableRefObject } from 'react';
import type { Scene, SceneMedia } from '@/lib/types';
import type { ScheduleGroup } from '@/lib/pipeline';
import { Plus } from './icons';
import { PostCardView } from './PostCardView';

const CARD_CHROME =
  'group relative flex-none cursor-pointer select-none overflow-hidden rounded-xl border border-line bg-card text-left shadow-card transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#3a3a44] hover:shadow-card-hover';

type PipelineBoardProps = {
  backlog: Scene[];
  groups: ScheduleGroup[];
  cardSize: number;
  mediaMap: Record<string, SceneMedia[]> | null;
  mediaUrls: Record<string, string>;
  onOpenPost: (id: string) => void;
  onAddPost: () => void;
  onReorderBacklog: (ordered: Scene[]) => void;
};

export function PipelineBoard({
  backlog,
  groups,
  cardSize,
  mediaMap,
  mediaUrls,
  onOpenPost,
  onAddPost,
  onReorderBacklog,
}: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragGuard = useRef(false);
  const guardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    if (guardTimer.current) clearTimeout(guardTimer.current);
    dragGuard.current = true;
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function endDrag() {
    setActiveId(null);
    setOverId(null);
    if (guardTimer.current) clearTimeout(guardTimer.current);
    guardTimer.current = setTimeout(() => {
      dragGuard.current = false;
    }, 300);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = backlog.findIndex((p) => p.id === active.id);
      const newIndex = backlog.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderBacklog(arrayMove(backlog, oldIndex, newIndex));
      }
    }
    endDrag();
  }

  if (backlog.length === 0 && groups.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[15px] font-semibold text-bright">No posts yet</div>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted">
          Plan your first post — copy, media, and a slot on the schedule.
        </p>
        <button
          type="button"
          onClick={onAddPost}
          className="flex h-[34px] items-center gap-[7px] rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Add your first post
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-[26px] pb-20 pt-7">
      {/* Backlog: manually ordered, draggable */}
      <SectionHeader>
        Backlog
        <span className="ml-2 font-normal normal-case tracking-normal text-[#54545e]">
          {backlog.length}
        </span>
      </SectionHeader>
      {backlog.length === 0 ? (
        <p className="mb-2 text-[12.5px] text-muted">
          Backlog is empty — unscheduled posts land here.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={endDrag}
        >
          <SortableContext items={backlog.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap content-start gap-[22px]">
              {backlog.map((post) => (
                <SortablePostCard
                  key={post.id}
                  post={post}
                  cardSize={cardSize}
                  media={mediaMap?.[post.id] ?? (mediaMap ? [] : undefined)}
                  mediaUrls={mediaUrls}
                  isOver={overId === post.id && activeId !== post.id}
                  dragGuard={dragGuard}
                  onOpen={onOpenPost}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Scheduled: grouped by date, ordered by time — not draggable */}
      <SectionHeader className="mt-9">Scheduled</SectionHeader>
      {groups.length === 0 ? (
        <p className="text-[12.5px] text-muted">
          Nothing scheduled yet — set a date on a post to slot it in.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="mb-7">
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
                <div
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  style={{ width: cardSize }}
                  onClick={() => onOpenPost(post.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenPost(post.id);
                    }
                  }}
                  className={CARD_CHROME}
                >
                  <PostCardView
                    post={post}
                    media={mediaMap?.[post.id] ?? (mediaMap ? [] : undefined)}
                    mediaUrls={mediaUrls}
                    showTime
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
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

function SortablePostCard({
  post,
  cardSize,
  media,
  mediaUrls,
  isOver,
  dragGuard,
  onOpen,
}: {
  post: Scene;
  cardSize: number;
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
  isOver: boolean;
  dragGuard: MutableRefObject<boolean>;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  });

  const style: React.CSSProperties = {
    width: cardSize,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

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
        onOpen(post.id);
      }}
      className={CARD_CHROME}
    >
      {isOver && (
        <div className="pointer-events-none absolute inset-0 z-[5] rounded-xl border-2 border-accent shadow-[0_0_0_4px_rgba(255,72,0,0.18)]" />
      )}
      <PostCardView post={post} media={media} mediaUrls={mediaUrls} />
    </div>
  );
}
