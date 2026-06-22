import { useCallback, useEffect, useState } from 'react';

/**
 * Persist a small piece of UI state to localStorage. Starts from `initial`
 * during SSR/first paint (avoids hydration mismatch), then reads the stored
 * value after mount.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed / unavailable storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore quota / unavailable storage
      }
    },
    [key],
  );

  return [value, set];
}
