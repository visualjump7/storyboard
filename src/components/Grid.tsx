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
import { useRef, useState } from 'react';
import type { Scene } from '@/lib/types';
import { Plus } from './icons';
import { SceneCard } from './SceneCard';

type GridProps = {
  scenes: Scene[];
  cardSize: number;
  imageUrls: Record<string, string>;
  onOpenScene: (id: string) => void;
  onAddScene: () => void;
  onReorder: (ordered: Scene[]) => void;
};

export function Grid({
  scenes,
  cardSize,
  imageUrls,
  onOpenScene,
  onAddScene,
  onReorder,
}: GridProps) {
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
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(scenes, oldIndex, newIndex));
      }
    }
    endDrag();
  }

  if (scenes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[15px] font-semibold text-bright">No scenes yet</div>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted">
          Add your first scene to start building the storyboard.
        </p>
        <button
          type="button"
          onClick={onAddScene}
          className="flex h-[34px] items-center gap-[7px] rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Add your first scene
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-[26px] pb-20 pt-7">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <SortableContext items={scenes.map((s) => s.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap content-start gap-[22px]">
            {scenes.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                number={index + 1}
                cardSize={cardSize}
                imageUrl={scene.image_path ? imageUrls[scene.image_path] : undefined}
                isOver={overId === scene.id && activeId !== scene.id}
                dragGuard={dragGuard}
                onOpen={onOpenScene}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
