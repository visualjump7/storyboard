import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scene } from '@/lib/types';
import { useSignedUrls } from './useSignedUrls';

/**
 * Maintain a { image_path -> signed display URL } map for the given scenes.
 * Thin wrapper over useSignedUrls, which owns the expiry/refresh timing.
 */
export function useSceneImageUrls(
  supabase: SupabaseClient,
  scenes: Scene[],
): Record<string, string> {
  return useSignedUrls(
    supabase,
    scenes.map((s) => s.image_path).filter((p): p is string => Boolean(p)),
  );
}
