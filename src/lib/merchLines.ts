import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MerchOrder,
  MerchOrderFields,
  MerchQuote,
  MerchQuoteFields,
} from './types';

/**
 * Quotes and orders — the repeating rows inside a merchandise product. Both
 * follow the same shape as scene_media: owned by user_id for RLS, ordered by
 * `position` within their product, and fetched for many products at once so
 * the list renders in a single round trip.
 */

// --- quotes ---------------------------------------------------------------

export async function fetchQuotesForScenes(
  supabase: SupabaseClient,
  sceneIds: string[],
): Promise<Record<string, MerchQuote[]>> {
  if (sceneIds.length === 0) return {};
  const { data, error } = await supabase
    .from('merch_quotes')
    .select('*')
    .in('scene_id', sceneIds)
    .order('position', { ascending: true });
  if (error) throw error;

  const map: Record<string, MerchQuote[]> = {};
  for (const id of sceneIds) map[id] = [];
  for (const row of (data ?? []) as MerchQuote[]) {
    (map[row.scene_id] ??= []).push(row);
  }
  return map;
}

export async function addQuote(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  position: number,
): Promise<MerchQuote> {
  const { data, error } = await supabase
    .from('merch_quotes')
    .insert({ user_id: userId, scene_id: sceneId, position })
    .select()
    .single();
  if (error) throw error;
  return data as MerchQuote;
}

export async function updateQuote(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<MerchQuoteFields>,
): Promise<void> {
  const { error } = await supabase
    .from('merch_quotes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function removeQuote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('merch_quotes').delete().eq('id', id);
  if (error) throw error;
}

// --- orders ---------------------------------------------------------------

export async function fetchOrdersForScenes(
  supabase: SupabaseClient,
  sceneIds: string[],
): Promise<Record<string, MerchOrder[]>> {
  if (sceneIds.length === 0) return {};
  const { data, error } = await supabase
    .from('merch_orders')
    .select('*')
    .in('scene_id', sceneIds)
    .order('position', { ascending: true });
  if (error) throw error;

  const map: Record<string, MerchOrder[]> = {};
  for (const id of sceneIds) map[id] = [];
  for (const row of (data ?? []) as MerchOrder[]) {
    (map[row.scene_id] ??= []).push(row);
  }
  return map;
}

export async function addOrder(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  position: number,
  supplier = '',
): Promise<MerchOrder> {
  const { data, error } = await supabase
    .from('merch_orders')
    .insert({ user_id: userId, scene_id: sceneId, position, supplier })
    .select()
    .single();
  if (error) throw error;
  return data as MerchOrder;
}

export async function updateOrder(
  supabase: SupabaseClient,
  id: string,
  fields: Partial<MerchOrderFields>,
): Promise<void> {
  const { error } = await supabase
    .from('merch_orders')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function removeOrder(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('merch_orders').delete().eq('id', id);
  if (error) throw error;
}

// --- derived numbers ------------------------------------------------------

/**
 * The cheapest real quote for a product — what a margin should be judged
 * against. Rows without a cost are sourcing leads, not quotes, so they're
 * skipped. Returns null when nothing has been quoted yet.
 */
export function bestQuote(quotes: MerchQuote[]): MerchQuote | null {
  const priced = quotes.filter((q) => q.unit_cost !== null);
  if (priced.length === 0) return null;
  return priced.reduce((best, q) => (q.unit_cost! < best.unit_cost! ? q : best));
}

/** Line total for an order, or null while either factor is unknown. */
export function orderTotal(order: MerchOrder): number | null {
  if (order.quantity === null || order.unit_cost === null) return null;
  return Math.round(order.quantity * order.unit_cost * 100) / 100;
}

/** Total committed across every order that hasn't been cancelled. */
export function committedTotal(orders: MerchOrder[]): number | null {
  const live = orders.filter((o) => o.status !== 'cancelled');
  const totals = live.map(orderTotal).filter((t): t is number => t !== null);
  if (totals.length === 0) return null;
  return Math.round(totals.reduce((a, b) => a + b, 0) * 100) / 100;
}
