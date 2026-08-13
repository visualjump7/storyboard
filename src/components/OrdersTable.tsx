'use client';

import { useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { formatMoney, parseCount, parseMoney } from '@/lib/merch';
import { orderTotal } from '@/lib/merchLines';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type MerchOrder,
  type MerchOrderFields,
  type OrderStatus,
} from '@/lib/types';
import { Plus, Trash } from './icons';

const INPUT =
  'h-[32px] w-full rounded-[7px] border border-line-2 bg-field px-2.5 text-[12.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent';

type OrdersTableProps = {
  orders: MerchOrder[];
  /** Supplier names from this product's quotes, offered as suggestions. */
  supplierOptions: string[];
  onAdd: () => void;
  onSave: (id: string, fields: Partial<MerchOrderFields>) => void;
  onRemove: (order: MerchOrder) => void;
};

export function OrdersTable({
  orders,
  supplierOptions,
  onAdd,
  onSave,
  onRemove,
}: OrdersTableProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Orders
        </span>
        <span className="text-[11px] text-[#54545e]">{orders.length}</span>
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto flex h-[28px] items-center gap-[6px] rounded-lg border border-[#30303a] bg-[#1f1f25] px-2.5 text-[12px] font-medium text-ink transition-colors hover:bg-[#27272e]"
        >
          <Plus size={12} />
          Add order
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#2a2a32] px-3 py-4 text-center text-[12px] text-[#4a4a54]">
          Nothing ordered yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              supplierOptions={supplierOptions}
              onSave={onSave}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type OrderForm = {
  supplier: string;
  quantity: string;
  unit_cost: string;
  ordered_at: string;
  expected_at: string;
  status: OrderStatus;
  notes: string;
};

function OrderRow({
  order,
  supplierOptions,
  onSave,
  onRemove,
}: {
  order: MerchOrder;
  supplierOptions: string[];
  onSave: (id: string, fields: Partial<MerchOrderFields>) => void;
  onRemove: (order: MerchOrder) => void;
}) {
  const listId = `suppliers-${order.id}`;
  const [form, setForm] = useState<OrderForm>({
    supplier: order.supplier,
    quantity: order.quantity === null ? '' : String(order.quantity),
    unit_cost: order.unit_cost === null ? '' : String(order.unit_cost),
    ordered_at: order.ordered_at ?? '',
    expected_at: order.expected_at ?? '',
    status: order.status,
    notes: order.notes,
  });
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(
    form,
    (value) => {
      const quantity = parseCount(value.quantity);
      const unitCost = parseMoney(value.unit_cost);
      onSave(order.id, {
        supplier: value.supplier,
        status: value.status,
        notes: value.notes,
        // Empty date input means "not set", which is null rather than ''.
        ordered_at: value.ordered_at || null,
        expected_at: value.expected_at || null,
        ...(quantity === undefined ? {} : { quantity }),
        ...(unitCost === undefined ? {} : { unit_cost: unitCost }),
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof OrderForm>(field: K, value: OrderForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  // Preview from the form so the total moves as you type.
  const total = orderTotal({
    ...order,
    quantity: parseCount(form.quantity) ?? null,
    unit_cost: parseMoney(form.unit_cost) ?? null,
  });

  return (
    <div
      className={[
        'rounded-lg border border-line-2 bg-[#17171c] p-2.5',
        form.status === 'cancelled' ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="mb-2 grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
        <input
          list={listId}
          value={form.supplier}
          onChange={(e) => update('supplier', e.target.value)}
          placeholder="Supplier"
          className={INPUT}
        />
        <datalist id={listId}>
          {supplierOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input
          value={form.quantity}
          onChange={(e) => update('quantity', e.target.value)}
          placeholder="Qty"
          inputMode="numeric"
          className={INPUT}
        />
        <input
          value={form.unit_cost}
          onChange={(e) => update('unit_cost', e.target.value)}
          placeholder="Unit cost"
          inputMode="decimal"
          className={INPUT}
        />
        <button
          type="button"
          aria-label="Remove order"
          title="Remove order"
          onClick={() => onRemove(order)}
          className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[7px] border border-[#34343c] bg-[#1d1d23] text-[#c96a6a] transition-colors hover:text-[#e08585]"
        >
          <Trash size={12} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="flex-none">Ordered</span>
          <input
            type="date"
            value={form.ordered_at}
            onChange={(e) => update('ordered_at', e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="flex-none">Due</span>
          <input
            type="date"
            value={form.expected_at}
            onChange={(e) => update('expected_at', e.target.value)}
            className={INPUT}
          />
        </label>
        <select
          value={form.status}
          onChange={(e) => update('status', e.target.value as OrderStatus)}
          className={`${INPUT} cursor-pointer`}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="w-[86px] flex-none text-right text-[12px] text-ink">
          {formatMoney(total)}
        </span>
      </div>

      <input
        value={form.notes}
        onChange={(e) => update('notes', e.target.value)}
        placeholder="Notes — PO number, shipping, issues"
        className={`${INPUT} mt-2`}
      />
    </div>
  );
}
