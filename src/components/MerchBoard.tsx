'use client';

import { MERCH_STATUS_LABELS } from '@/lib/types';
import type { MerchColumn } from '@/lib/merch';
import type { Scene, SceneMedia } from '@/lib/types';
import { Plus } from './icons';
import { MerchCardView } from './MerchCardView';

const CARD_CHROME =
  'group relative cursor-pointer select-none overflow-hidden rounded-xl border border-line bg-card text-left shadow-card transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#3a3a44] hover:shadow-card-hover';

type MerchBoardProps = {
  columns: MerchColumn[];
  itemCount: number;
  mediaMap: Record<string, SceneMedia[]> | null;
  mediaUrls: Record<string, string>;
  onOpenItem: (id: string) => void;
  onAddItem: () => void;
};

/**
 * The merchandise tracking board: one column per stage, so it reads at a
 * glance which items are still being sourced and which are ready.
 */
export function MerchBoard({
  columns,
  itemCount,
  mediaMap,
  mediaUrls,
  onOpenItem,
  onAddItem,
}: MerchBoardProps) {
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
      <div className="flex min-h-full items-start gap-5">
        {columns.map((column) => (
          <section key={column.status} className="flex w-[268px] flex-none flex-col">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                {MERCH_STATUS_LABELS[column.status]}
              </span>
              <span className="text-[11px] text-[#54545e]">{column.items.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {column.items.map((item) => (
                <MerchCard
                  key={item.id}
                  item={item}
                  media={mediaMap?.[item.id] ?? (mediaMap ? [] : undefined)}
                  mediaUrls={mediaUrls}
                  onOpen={onOpenItem}
                />
              ))}

              {column.items.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#2a2a32] px-3 py-6 text-center text-[12px] text-[#4a4a54]">
                  Nothing here
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MerchCard({
  item,
  media,
  mediaUrls,
  onOpen,
}: {
  item: Scene;
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
      className={CARD_CHROME}
    >
      <MerchCardView item={item} media={media} mediaUrls={mediaUrls} />
    </div>
  );
}
