'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { fetchScript, saveScript } from '@/lib/script';
import { ChevronRight } from './icons';

type ScriptPanelProps = {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  onClose: () => void;
};

export function ScriptPanel({ supabase, userId, projectId, onClose }: ScriptPanelProps) {
  // null while loading, so we never overwrite stored text with an empty string.
  const [text, setText] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    setText(null);
    setDirty(false);
    fetchScript(supabase, projectId)
      .then((content) => {
        if (active) setText(content);
      })
      .catch(() => {
        if (active) setText('');
      });
    return () => {
      active = false;
    };
  }, [supabase, projectId]);

  useDebouncedSave(
    text ?? '',
    (value) => void saveScript(supabase, userId, projectId, value),
    400,
    dirty && text !== null,
  );

  const words = useMemo(() => {
    const t = (text ?? '').trim();
    return t ? t.split(/\s+/).length : 0;
  }, [text]);

  return (
    <div className="flex w-[380px] flex-none flex-col border-l border-line bg-panel">
      <div className="flex h-[52px] flex-none items-center justify-between px-[18px]">
        <div className="flex items-center gap-[9px]">
          <span className="text-[13.5px] font-semibold">Script</span>
          <span className="text-[11.5px] text-muted">
            {text === null ? 'Loading…' : `${words} words`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close script panel"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#8a8a92] transition-colors hover:bg-[#1f1f25] hover:text-ink"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <textarea
        value={text ?? ''}
        disabled={text === null}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        placeholder={'Write your full script here…\n\nINT. WAREHOUSE — NIGHT\n\nA single bulb sways overhead…'}
        className="w-full flex-1 resize-none border-none bg-transparent p-[18px] text-[13.5px] leading-[1.7] text-[#cfcfd4] outline-none"
      />
    </div>
  );
}
