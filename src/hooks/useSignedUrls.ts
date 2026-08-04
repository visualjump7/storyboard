import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { signImageUrls } from '@/lib/storage';

// Signed URLs are bearer credentials, so keep them short-lived and re-sign
// before expiry. REFRESH_MS must stay below EXPIRES_IN to avoid a 403 gap.
const EXPIRES_IN = 600; // 10 minutes
const REFRESH_MS = 8 * 60 * 1000; // re-sign at 8 min

/**
 * Maintain a { object path -> signed display URL } map for any set of bucket
 * paths (scene images, post media — images and videos alike). Re-signs
 * whenever the set of paths changes and periodically before expiry, so media
 * keeps loading during long sessions.
 */
export function useSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const pathsKey = [...paths].sort().join('|');

  useEffect(() => {
    if (paths.length === 0) {
      setUrls({});
      return;
    }

    let active = true;
    const sign = async () => {
      try {
        const map = await signImageUrls(supabase, paths, EXPIRES_IN);
        if (active) setUrls(map);
      } catch {
        // Leave the previous URLs in place on a transient failure.
      }
    };

    void sign();
    const interval = setInterval(sign, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, supabase]);

  return urls;
}
