'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type MutableRefObject } from 'react';
import { MERCH_STATUS_LABELS, type MerchStatus, type Scene, type SceneMedia } from '@/lib/types';
import type { MerchColumn } from '@/lib/merch';
import { Plus } from './icons';
import { MerchCardView } from './MerchCardView';

const CARD_CHROME =
  'group relative cursor-pointer select-none overflow-hidden rounded-xl border border-line bg-card text-left shadow-card transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#3a3a44] hover:shadow-card-hover';

/** Droppable id for an empty column — distinct from any item id. */
const COLUMN_PREFIX = 'column:';

type MerchBoardProps = {
  columns: MerchColumn[];
  itemCount: number;
  mediaMap: Record<string, SceneMedia[]> | null;
  mediaUrls: Record<string, string>;
  onOpenItem: (id: string) => void;
  onAddItem: () => void;
  /** Move an item to a stage at a position within that stage's column. */
  onMoveItem: (itemId: string, toStatus: MerchStatus, toIndex: number) => void;
};

/**
 * The merchandise tracking board: one column per stage, cards draggable
 * between them so moving an item along is the same gesture as reading it.
 */
export function MerchBoard({
  columns,
  itemCount,
  mediaMap,
  mediaUrls,
  onOpenItem,
  onAddItem,
  onMoveItem,
}: MerchBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<MerchStatus | null>(null);
  // Suppresses the click that browsers fire at the end of a drag.
  const dragGuard = useRef(false);
  const guardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Resolve a drop target (a card or an empty column) to its stage. */
  function statusOf(id: string): MerchStatus | null {
    if (id.startsWith(COLUMN_PREFIX)) return id.slice(COLUMN_PREFIX.length) as MerchStatus;
    for (const column of columns) {
      if (column.items.some((i) => i.id === id)) return column.status;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    if (guardTimer.current) clearTimeout(guardTimer.current);
    dragGuard.current = true;
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumn(event.over ? statusOf(String(event.over.id)) : null);
  }

  function endDrag() {
    setActiveId(null);
    setOverColumn(null);
    if (guardTimer.current) clearTimeout(guardTimer.current);
    guardTimer.current = setTimeout(() => {
      dragGuard.current = false;
    }, 300);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      endDrag();
      return;
    }
    const itemId = String(active.id);
    const overId = String(over.id);
    const toStatus = statusOf(overId);

    if (toStatus) {
      const target = columns.find((c) => c.status === toStatus);
      const from = columns.find((c) => c.items.some((i) => i.id === itemId));
      const withoutActive = (target?.items ?? []).filter((i) => i.id !== itemId);
      // Dropped on a card: take that card's slot. Dropped on the column
      // itself (its empty area): append.
      const toIndex = overId.startsWith(COLUMN_PREFIX)
        ? withoutActive.length
        : Math.max(0, withoutActive.findIndex((i) => i.id === overId));

      const unchanged =
        from?.status === toStatus &&
        from.items.findIndex((i) => i.id === itemId) === toIndex;
      if (!unchanged) onMoveItem(itemId, toStatus, toIndex);
    }
    endDrag();
  }

  if (itemCount === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[15px] font-semibold text-bright">No items yet</div>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted">
          Add an item and drop in a picture — supplier, cost, and price can be filled in later.
        </p>
        <button
          type="button"
          onClick={onAddItem}
          className="flex h-[34px] items-center gap-[7px] rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Add your first item
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-auto px-[26px] pb-20 pt-7">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <div className="flex min-h-full items-start gap-5">
          {columns.map((column) => (
            <StageColumn
              key={column.status}
              column={column}
              isOver={overColumn === column.status && activeId !== null}
              mediaMap={mediaMap}
              mediaUrls={mediaUrls}
              dragGuard={dragGuard}
              activeId={activeId}
              onOpenItem={onOpenItem}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function StageColumn({
  column,
  isOver,
  mediaMap,
  mediaUrls,
  dragGuard,
  activeId,
  onOpenItem,
}: {
  column: MerchColumn;
  isOver: boolean;
  mediaMap: Record<string, SceneMedia[]> | null;
  mediaUrls: Record<string, string>;
  dragGuard: MutableRefObject<boolean>;
  activeId: string | null;
  onOpenItem: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_PREFIX}${column.status}` });

  return (
    <section className="flex w-[268px] flex-none flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          {MERCH_STATUS_LABELS[column.status]}
        </span>
        <span className="text-[11px] text-[#54545e]">{column.items.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex min-h-[120px] flex-col gap-3 rounded-xl p-1 transition-colors',
          isOver ? 'bg-[#1b1b22] ring-1 ring-accent/40' : '',
        ].join(' ')}
      >
        <SortableContext
          items={column.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.items.map((item) => (
            <SortableMerchCard
              key={item.id}
              item={item}
              media={mediaMap?.[item.id] ?? (mediaMap ? [] : undefined)}
              mediaUrls={mediaUrls}
              isDragging={activeId === item.id}
              dragGuard={dragGuard}
              onOpen={onOpenItem}
            />
          ))}
        </SortableContext>

        {column.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#2a2a32] px-3 py-6 text-center text-[12px] text-[#4a4a54]">
            {isOver ? 'Drop here' : 'Nothing here'}
          </p>
        )}
      </div>
    </section>
  );
}

function SortableMerchCard({
  item,
  media,
  mediaUrls,
  isDragging,
  dragGuard,
  onOpen,
}: {
  item: Scene;
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
  isDragging: boolean;
  dragGuard: MutableRefObject<boolean>;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
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
        onOpen(item.id);
      }}
      className={CARD_CHROME}
    >
      <MerchCardView item={item} media={media} mediaUrls={mediaUrls} />
    </div>
  );
}
