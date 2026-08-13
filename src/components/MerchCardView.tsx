'use client';

import { formatMoney, marginPercent } from '@/lib/merch';
import type { Scene, SceneMedia } from '@/lib/types';

type MerchCardViewProps = {
  item: Scene;
  /** undefined = media still loading; [] = loaded and empty. */
  media?: SceneMedia[];
  mediaUrls: Record<string, string>;
};

/** The inner face of a merchandise card: cover image, name, and the numbers. */
export function MerchCardView({ item, media, mediaUrls }: MerchCardViewProps) {
  const cover = media?.find((m) => m.kind === 'image');
  const coverUrl = cover ? mediaUrls[cover.path] : undefined;
  const extra = media ? Math.max(0, media.length - 1) : 0;
  const pct = marginPercent(item);

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden bg-[#15151a]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={item.name || 'Merchandise item'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[#4a4a54]">
            {media === undefined ? '' : 'No image'}
          </div>
        )}
        {extra > 0 && (
          <span className="absolute bottom-2 right-2 rounded bg-[rgba(6,6,8,0.78)] px-1.5 py-0.5 text-[10.5px] text-[#c4c4cc]">
            +{extra}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="truncate text-[13px] font-medium text-bright">
          {item.name || 'Untitled item'}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 text-[12px]">
          <span className="text-muted">{formatMoney(item.cost)}</span>
          <span className="text-[#3a3a44]">→</span>
          <span className="text-ink">{formatMoney(item.sale_price)}</span>
          {pct !== null && (
            <span
              className={`ml-auto text-[11.5px] ${pct >= 0 ? 'text-[#6ec08a]' : 'text-[#c96a6a]'}`}
            >
              {pct >= 0 ? '+' : ''}
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
        {item.dev_time && (
          <div className="mt-1 truncate text-[11.5px] text-muted">{item.dev_time}</div>
        )}
      </div>
    </>
  );
}
