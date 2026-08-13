import type { SupabaseClient } from '@supabase/supabase-js';
import type { MerchFields } from './types';

/**
 * Persist edits to a product's own fields. Mirrors updatePostFields, including
 * the manual updated_at, so the storyboard and social paths stay untouched.
 * Quotes and orders are separate rows — see merchLines.
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

/** Unit margin, or null while either side of the sum is unknown. */
export function margin(cost: number | null, salePrice: number | null): number | null {
  if (cost === null || salePrice === null) return null;
  return Math.round((salePrice - cost) * 100) / 100;
}

/**
 * Margin as a share of sale price. Null when unknown, or when sale price is 0
 * — which would divide by zero rather than mean anything.
 */
export function marginPercent(cost: number | null, salePrice: number | null): number | null {
  const m = margin(cost, salePrice);
  if (m === null || !salePrice) return null;
  return (m / salePrice) * 100;
}

/** Format money for display. An em dash stands for "not known yet". */
export function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(2)}`;
}

/**
 * Parse a money input into a storable number. Empty input means "unknown"
 * (null) rather than 0; anything unparseable returns undefined so the caller
 * can leave the stored value alone.
 */
export function parseMoney(input: string): number | null | undefined {
  const trimmed = input.trim().replace(/^\$/, '');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

/** Parse a whole-number input (quantity, MOQ). Same null/undefined contract. */
export function parseCount(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return undefined;
  return n;
}
