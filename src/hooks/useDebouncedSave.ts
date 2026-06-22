import { useEffect, useRef } from 'react';

/**
 * Autosave helper. Calls `save(value)` ~`delay`ms after `value` last changed,
 * and flushes the pending value on unmount so a quick close/navigate never
 * drops the final edit. Pass `enabled: false` to suppress saving until the
 * value is actually dirty (avoids churn on mount with no edits).
 */
export function useDebouncedSave<T>(
  value: T,
  save: (value: T) => void,
  delay = 400,
  enabled = true,
): void {
  const saveRef = useRef(save);
  saveRef.current = save;

  const valueRef = useRef(value);
  valueRef.current = value;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // What we last persisted, so a flush on unmount doesn't repeat a write the
  // debounce timer already made.
  const lastSavedRef = useRef<T>(value);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    timer.current = setTimeout(() => {
      lastSavedRef.current = valueRef.current;
      saveRef.current(valueRef.current);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, enabled]);

  // Flush the final edit on unmount — only if it differs from what we last
  // persisted, so closing/navigating after the timer fired is a no-op.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (enabledRef.current && valueRef.current !== lastSavedRef.current) {
        lastSavedRef.current = valueRef.current;
        saveRef.current(valueRef.current);
      }
    };
  }, []);
}
