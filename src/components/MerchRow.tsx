'use client';

import { useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { formatMoney, marginPercent, parseMoney } from '@/lib/merch';
import { bestQuote, committedTotal } from '@/lib/merchLines';
import {
  MERCH_STATUSES,
  MERCH_STATUS_LABELS,
  asMerchStatus,
  type MerchFields,
  type MerchOrder,
  type MerchOrderFields,
  type MerchQuote,
  type MerchQuoteFields,
  type MerchStatus,
  type Scene,
  type SceneMedia,
} from '@/lib/types';
import { ChevronRight, Trash } from './icons';
import { MediaStrip } from './MediaStrip';
import { OrdersTable } from './OrdersTable';
import { QuotesTable } from './QuotesTable';

const INPUT =
  'h-[36px] w-full rounded-[8px] border border-line-2 bg-field px-3 text-[13px] text-[#d6d6db] outline-none transition-colors focus:border-accent';

type MerchRowProps = {
  item: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  quotes: MerchQuote[];
  orders: MerchOrder[];
  expanded: boolean;
  uploading: boolean;
  onToggle: () => void;
  onSaveFields: (id: string, fields: Partial<MerchFields>) => void;
  onDelete: (item: Scene) => void;
  onAddMedia: (item: Scene, files: File[]) => void;
  onRemoveMedia: (item: Scene, media: SceneMedia) => void;
  onReorderMedia: (item: Scene, ordered: SceneMedia[]) => void;
  onAddQuote: (item: Scene) => void;
  onSaveQuote: (id: string, fields: Partial<MerchQuoteFields>) => void;
  onRemoveQuote: (quote: MerchQuote) => void;
  onAddOrder: (item: Scene) => void;
  onSaveOrder: (id: string, fields: Partial<MerchOrderFields>) => void;
  onRemoveOrder: (order: MerchOrder) => void;
};

type ProductForm = {
  name: string;
  description: string;
  status: MerchStatus;
  sale_price: string;
  dev_time: string;
};

/**
 * One product, collapsed to a summary line and expanded to everything about
 * it — pictures, concept, its suppliers/quotes, and its orders.
 */
export function MerchRow({
  item,
  media,
  mediaUrls,
  quotes,
  orders,
  expanded,
  uploading,
  onToggle,
  onSaveFields,
  onDelete,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onAddQuote,
  onSaveQuote,
  onRemoveQuote,
  onAddOrder,
  onSaveOrder,
  onRemoveOrder,
}: MerchRowProps) {
  const [form, setForm] = useState<ProductForm>({
    name: item.name,
    description: item.description,
    status: asMerchStatus(item.status),
    sale_price: item.sale_price === null ? '' : String(item.sale_price),
    dev_time: item.dev_time ?? '',
  });
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(
    form,
    (value) => {
      const salePrice = parseMoney(value.sale_price);
      onSaveFields(item.id, {
        name: value.name,
        description: value.description,
        status: value.status,
        dev_time: value.dev_time,
        ...(salePrice === undefined ? {} : { sale_price: salePrice }),
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  const best = bestQuote(quotes);
  const salePreview = parseMoney(form.sale_price) ?? null;
  const pct = marginPercent(best?.unit_cost ?? null, salePreview);
  const committed = committedTotal(orders);

  const cover = media.find((m) => m.kind === 'image');
  const coverUrl = cover ? mediaUrls[cover.path] : undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      {/* Summary line — the whole strip toggles. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer select-none items-center gap-3.5 px-3.5 py-3 transition-colors hover:bg-[#1a1a20]"
      >
        <span
          className={`flex-none text-muted transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
        >
          <ChevronRight size={15} />
        </span>

        <div className="h-[44px] w-[44px] flex-none overflow-hidden rounded-lg bg-[#15151a]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>

        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-bright">
          {form.name || 'Untitled product'}
        </span>

        <span className="hidden flex-none items-center gap-1.5 text-[12px] sm:flex">
          <span className="text-muted">{formatMoney(best?.unit_cost ?? null)}</span>
          <span className="text-[#3a3a44]">→</span>
          <span className="text-ink">{formatMoney(salePreview)}</span>
          {pct !== null && (
            <span className={pct >= 0 ? 'text-[#6ec08a]' : 'text-[#c96a6a]'}>
              {pct >= 0 ? '+' : ''}
              {pct.toFixed(0)}%
            </span>
          )}
        </span>

        <span className="hidden flex-none text-[11.5px] text-muted md:block">
          {quotes.length} quote{quotes.length === 1 ? '' : 's'} · {orders.length} order
          {orders.length === 1 ? '' : 's'}
        </span>

        <span className="flex h-[22px] flex-none items-center rounded border border-[#32323c] bg-[#22222a] px-2 text-[10.5px] font-medium uppercase tracking-wide text-[#b4b4be]">
          {MERCH_STATUS_LABELS[form.status]}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-[#24242b] px-3.5 pb-5 pt-4">
          <MediaStrip
            media={media}
            mediaUrls={mediaUrls}
            uploading={uploading}
            onAddFiles={(files) => onAddMedia(item, files)}
            onRemove={(m) => onRemoveMedia(item, m)}
            onReorder={(ordered) => onReorderMedia(item, ordered)}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <Field label="Product name">
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Luna Plushie"
                className={INPUT}
              />
            </Field>
            <Field label="Stage">
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as MerchStatus)}
                className={`${INPUT} cursor-pointer`}
              >
                {MERCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MERCH_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sale price">
              <input
                value={form.sale_price}
                onChange={(e) => update('sale_price', e.target.value)}
                placeholder="—"
                inputMode="decimal"
                className={INPUT}
              />
            </Field>
            <Field label="Development time">
              <input
                value={form.dev_time}
                onChange={(e) => update('dev_time', e.target.value)}
                placeholder="4–6 weeks"
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Concept" className="mt-3">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Materials, sizing, colourways, packaging…"
              className="min-h-[84px] w-full resize-y rounded-[8px] border border-line-2 bg-field px-3 py-2.5 text-[13px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
            />
          </Field>

          <div className="mt-5">
            <QuotesTable
              quotes={quotes}
              bestId={best?.id ?? null}
              onAdd={() => onAddQuote(item)}
              onSave={onSaveQuote}
              onRemove={onRemoveQuote}
            />
          </div>

          <div className="mt-5">
            <OrdersTable
              orders={orders}
              supplierOptions={quotes.map((q) => q.supplier).filter(Boolean)}
              onAdd={() => onAddOrder(item)}
              onSave={onSaveOrder}
              onRemove={onRemoveOrder}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="flex h-[32px] items-center gap-[6px] rounded-lg border border-[#4a2a30] bg-[#251618] px-3 text-[12px] font-medium text-[#c96a6a] transition-colors hover:bg-[#2d1a1d]"
            >
              <Trash size={12} />
              Delete product
            </button>
            {committed !== null && (
              <span className="ml-auto text-[12px] text-muted">
                Committed across orders:{' '}
                <span className="text-ink">{formatMoney(committed)}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
