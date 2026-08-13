'use client';

import { useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { formatMoney, margin, marginPercent, parseMoney } from '@/lib/merch';
import {
  MERCH_STATUSES,
  MERCH_STATUS_LABELS,
  asMerchStatus,
  type MerchFields,
  type MerchStatus,
  type Scene,
  type SceneMedia,
} from '@/lib/types';
import { MediaStrip } from './MediaStrip';

type MerchForm = {
  name: string;
  description: string;
  status: MerchStatus;
  supplier_url: string;
  /** Kept as raw text so a half-typed "12." doesn't fight the parser. */
  cost: string;
  sale_price: string;
  dev_time: string;
};

type MerchEditorProps = {
  /** The live item. Keyed by item.id by the parent, so navigating remounts
   * this with fresh form state. */
  item: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onSaveFields: (id: string, fields: Partial<MerchFields>) => void;
  onAddMedia: (item: Scene, files: File[]) => void;
  onRemoveMedia: (item: Scene, media: SceneMedia) => void;
  onReorderMedia: (item: Scene, ordered: SceneMedia[]) => void;
  onDelete: (item: Scene) => void;
};

function moneyToInput(value: number | null): string {
  return value === null ? '' : String(value);
}

export function MerchEditor({
  item,
  media,
  mediaUrls,
  uploading,
  onSaveFields,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onDelete,
}: MerchEditorProps) {
  const [form, setForm] = useState<MerchForm>({
    name: item.name,
    description: item.description,
    status: asMerchStatus(item.status),
    supplier_url: item.supplier_url ?? '',
    cost: moneyToInput(item.cost),
    sale_price: moneyToInput(item.sale_price),
    dev_time: item.dev_time ?? '',
  });
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(
    form,
    (value) => {
      const cost = parseMoney(value.cost);
      const salePrice = parseMoney(value.sale_price);
      onSaveFields(item.id, {
        name: value.name,
        description: value.description,
        status: value.status,
        supplier_url: value.supplier_url.trim(),
        dev_time: value.dev_time,
        // undefined means unparseable — omit the key so the stored value stands.
        ...(cost === undefined ? {} : { cost }),
        ...(salePrice === undefined ? {} : { sale_price: salePrice }),
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof MerchForm>(field: K, value: MerchForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  // Live preview from the form, so the margin updates as you type.
  const preview = { cost: parseMoney(form.cost) ?? null, sale_price: parseMoney(form.sale_price) ?? null };
  const marginValue = margin(preview);
  const marginPct = marginPercent(preview);

  const supplierHref = form.supplier_url.trim();
  const supplierIsHttp = /^https?:\/\//i.test(supplierHref);

  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-8 pt-5">
      <MediaStrip
        media={media}
        mediaUrls={mediaUrls}
        uploading={uploading}
        onAddFiles={(files) => onAddMedia(item, files)}
        onRemove={(m) => onRemoveMedia(item, m)}
        onReorder={(ordered) => onReorderMedia(item, ordered)}
      />

      <Field label="Item name" className="mt-[22px]">
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Untitled item"
          className="h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[15px] font-medium text-bright outline-none transition-colors focus:border-accent"
        />
      </Field>

      <Field label="Description" className="mt-[18px]">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Materials, sizing, colourways, packaging…"
          className="min-h-[110px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
      </Field>

      <Field label="Supplier" className="mt-[18px]">
        <input
          value={form.supplier_url}
          onChange={(e) => update('supplier_url', e.target.value)}
          placeholder="https://supplier.example.com/plush-manufacturing"
          inputMode="url"
          className="h-[38px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
        {supplierHref && supplierIsHttp && (
          <a
            href={supplierHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block truncate text-[11.5px] text-accent underline underline-offset-2 hover:opacity-80"
          >
            Open supplier ↗
          </a>
        )}
      </Field>

      <div className="mt-[18px] grid grid-cols-2 gap-3">
        <Field label="Unit cost">
          <input
            value={form.cost}
            onChange={(e) => update('cost', e.target.value)}
            placeholder="—"
            inputMode="decimal"
            className="h-[38px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          />
        </Field>
        <Field label="Sale price">
          <input
            value={form.sale_price}
            onChange={(e) => update('sale_price', e.target.value)}
            placeholder="—"
            inputMode="decimal"
            className="h-[38px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          />
        </Field>
      </div>

      {/* Derived, never stored — so it can't drift from cost and price. */}
      <div className="mt-2.5 flex items-center gap-2 text-[12px]">
        <span className="text-muted">Margin</span>
        {marginValue === null ? (
          <span className="text-[#4a4a54]">— set both cost and price</span>
        ) : (
          <span className={marginValue >= 0 ? 'text-[#6ec08a]' : 'text-[#c96a6a]'}>
            {formatMoney(marginValue)}
            {marginPct !== null && ` (${marginPct >= 0 ? '+' : ''}${marginPct.toFixed(0)}%)`}
          </span>
        )}
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-3">
        <Field label="Stage">
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as MerchStatus)}
            className="h-[38px] w-full cursor-pointer rounded-[9px] border border-line-2 bg-field px-3 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          >
            {MERCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MERCH_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Development time">
          <input
            value={form.dev_time}
            onChange={(e) => update('dev_time', e.target.value)}
            placeholder="4–6 weeks"
            className="h-[38px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => onDelete(item)}
        className="mt-8 h-[36px] rounded-lg border border-[#4a2a30] bg-[#251618] px-3.5 text-[12.5px] font-medium text-[#c96a6a] transition-colors hover:bg-[#2d1a1d]"
      >
        Delete item
      </button>
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
