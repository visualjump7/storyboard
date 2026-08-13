'use client';

import { useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { formatMoney, parseCount, parseMoney } from '@/lib/merch';
import type { MerchQuote, MerchQuoteFields } from '@/lib/types';
import { Plus, Trash } from './icons';

const INPUT =
  'h-[32px] w-full rounded-[7px] border border-line-2 bg-field px-2.5 text-[12.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent';

type QuotesTableProps = {
  quotes: MerchQuote[];
  /** Cheapest priced quote, highlighted as the one margin is judged against. */
  bestId: string | null;
  onAdd: () => void;
  onSave: (id: string, fields: Partial<MerchQuoteFields>) => void;
  onRemove: (quote: MerchQuote) => void;
};

export function QuotesTable({ quotes, bestId, onAdd, onSave, onRemove }: QuotesTableProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Sourcing &amp; quotes
        </span>
        <span className="text-[11px] text-[#54545e]">{quotes.length}</span>
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto flex h-[28px] items-center gap-[6px] rounded-lg border border-[#30303a] bg-[#1f1f25] px-2.5 text-[12px] font-medium text-ink transition-colors hover:bg-[#27272e]"
        >
          <Plus size={12} />
          Add supplier
        </button>
      </div>

      {quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#2a2a32] px-3 py-4 text-center text-[12px] text-[#4a4a54]">
          No suppliers yet — add one, then fill in a price when it comes back.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {quotes.map((quote) => (
            <QuoteRow
              key={quote.id}
              quote={quote}
              isBest={quote.id === bestId}
              onSave={onSave}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type QuoteForm = {
  supplier: string;
  contact: string;
  url: string;
  unit_cost: string;
  moq: string;
  lead_time: string;
  notes: string;
};

function QuoteRow({
  quote,
  isBest,
  onSave,
  onRemove,
}: {
  quote: MerchQuote;
  isBest: boolean;
  onSave: (id: string, fields: Partial<MerchQuoteFields>) => void;
  onRemove: (quote: MerchQuote) => void;
}) {
  const [form, setForm] = useState<QuoteForm>({
    supplier: quote.supplier,
    contact: quote.contact,
    url: quote.url,
    unit_cost: quote.unit_cost === null ? '' : String(quote.unit_cost),
    moq: quote.moq === null ? '' : String(quote.moq),
    lead_time: quote.lead_time,
    notes: quote.notes,
  });
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(
    form,
    (value) => {
      const unitCost = parseMoney(value.unit_cost);
      const moq = parseCount(value.moq);
      onSave(quote.id, {
        supplier: value.supplier,
        contact: value.contact,
        url: value.url.trim(),
        lead_time: value.lead_time,
        notes: value.notes,
        // undefined means unparseable — omit so the stored value stands.
        ...(unitCost === undefined ? {} : { unit_cost: unitCost }),
        ...(moq === undefined ? {} : { moq }),
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof QuoteForm>(field: K, value: QuoteForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  const isLead = parseMoney(form.unit_cost) === null;

  return (
    <div
      className={[
        'rounded-lg border bg-[#17171c] p-2.5',
        isBest ? 'border-accent/50' : 'border-line-2',
      ].join(' ')}
    >
      <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input
          value={form.supplier}
          onChange={(e) => update('supplier', e.target.value)}
          placeholder="Supplier / factory"
          className={INPUT}
        />
        <input
          value={form.contact}
          onChange={(e) => update('contact', e.target.value)}
          placeholder="Contact (name, email)"
          className={INPUT}
        />
        <input
          value={form.url}
          onChange={(e) => update('url', e.target.value)}
          placeholder="https://…"
          inputMode="url"
          className={INPUT}
        />
        <button
          type="button"
          aria-label="Remove supplier"
          title="Remove supplier"
          onClick={() => onRemove(quote)}
          className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[7px] border border-[#34343c] bg-[#1d1d23] text-[#c96a6a] transition-colors hover:text-[#e08585]"
        >
          <Trash size={12} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
        <input
          value={form.unit_cost}
          onChange={(e) => update('unit_cost', e.target.value)}
          placeholder="Unit cost"
          inputMode="decimal"
          className={INPUT}
        />
        <input
          value={form.moq}
          onChange={(e) => update('moq', e.target.value)}
          placeholder="MOQ"
          inputMode="numeric"
          className={INPUT}
        />
        <input
          value={form.lead_time}
          onChange={(e) => update('lead_time', e.target.value)}
          placeholder="Lead time"
          className={INPUT}
        />
        <span className="w-[86px] flex-none text-right text-[11px]">
          {isBest ? (
            <span className="text-accent">Best</span>
          ) : isLead ? (
            <span className="text-[#54545e]">No price</span>
          ) : (
            <span className="text-muted">{formatMoney(parseMoney(form.unit_cost) ?? null)}</span>
          )}
        </span>
      </div>

      <input
        value={form.notes}
        onChange={(e) => update('notes', e.target.value)}
        placeholder="Notes — materials, samples, why this supplier"
        className={`${INPUT} mt-2`}
      />
    </div>
  );
}
