import type { SupabaseClient } from '@supabase/supabase-js';
import { MERCH_STATUSES, asMerchStatus, type MerchFields, type MerchStatus, type Scene } from './types';

/**
 * Persist edits to a merchandise item. Mirrors updatePostFields, including the
 * manual updated_at, so the storyboard and social paths stay untouched.
 */
export async function updateMerchFields(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<MerchFields>,
): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export type MerchColumn = {
  status: MerchStatus;
  items: Scene[];
};

/**
 * Bucket items into board columns by status, preserving order_index within
 * each. A row whose status isn't a merchandise stage (a legacy row, or one
 * created before this project became a merch board) falls into 'idea' rather
 * than vanishing from the board.
 */
export function groupByStatus(items: Scene[]): MerchColumn[] {
  const buckets = new Map<MerchStatus, Scene[]>(MERCH_STATUSES.map((s) => [s, []]));
  const ordered = [...items].sort((a, b) => a.order_index - b.order_index);

  for (const item of ordered) {
    buckets.get(asMerchStatus(item.status))!.push(item);
  }

  return MERCH_STATUSES.map((status) => ({ status, items: buckets.get(status)! }));
}

/**
 * Move an item to a stage at a position within that column, returning the
 * whole board renumbered in reading order (column by column).
 *
 * order_index is global across the project rather than per column, so the flat
 * renumbering is what keeps the stored order authoritative and identical to
 * what the board shows. Returns the input unchanged when the id isn't found.
 */
export function moveItem(
  items: Scene[],
  itemId: string,
  toStatus: MerchStatus,
  toIndex: number,
): Scene[] {
  const moving = items.find((i) => i.id === itemId);
  if (!moving) return items;

  const columns = groupByStatus(items).map((c) => ({
    status: c.status,
    items: c.items.filter((i) => i.id !== itemId),
  }));

  const target = columns.find((c) => c.status === toStatus);
  if (!target) return items;

  const at = Math.max(0, Math.min(toIndex, target.items.length));
  target.items.splice(at, 0, { ...moving, status: toStatus });

  return columns.flatMap((c) => c.items).map((item, index) => ({ ...item, order_index: index }));
}

/** Unit margin, or null when either side of the sum is still unknown. */
export function margin(item: Pick<Scene, 'cost' | 'sale_price'>): number | null {
  if (item.cost === null || item.sale_price === null) return null;
  return item.sale_price - item.cost;
}

/**
 * Margin as a share of sale price. Null when unknown, or when sale_price is 0
 * (which would divide by zero rather than mean anything useful).
 */
export function marginPercent(item: Pick<Scene, 'cost' | 'sale_price'>): number | null {
  const m = margin(item);
  if (m === null || !item.sale_price) return null;
  return (m / item.sale_price) * 100;
}

/** Format money for display. Returns an em dash when the value is unknown. */
export function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(2)}`;
}

/**
 * Parse a money input into a storable number. Empty input means "unknown"
 * (null) rather than 0; anything unparseable is rejected as undefined so the
 * caller can leave the stored value alone.
 */
export function parseMoney(input: string): number | null | undefined {
  const trimmed = input.trim().replace(/^\$/, '');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}
