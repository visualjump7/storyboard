'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createProject } from '@/lib/projects';
import type { Project } from '@/lib/types';
import { ChevronDown, GridIcon, Plus } from './icons';

type ProjectSwitcherProps = {
  supabase: SupabaseClient;
  userId: string;
  project: Project;
  projects: Project[];
};

/** Toolbar dropdown: shows the current project, switches between projects,
 * creates a new one, or jumps back to the projects index. */
export function ProjectSwitcher({ supabase, userId, project, projects }: ProjectSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fall back to the current project if the list hasn't loaded yet.
  const list = projects.length ? projects : [project];

  async function newProject() {
    setBusy(true);
    try {
      const p = await createProject(supabase, userId, 'Untitled project');
      router.push(`/p/${p.id}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function goto(id: string) {
    setOpen(false);
    if (id !== project.id) router.push(`/p/${id}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 max-w-[260px] items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold tracking-[-0.01em] text-ink transition-colors hover:bg-[#1f1f25]"
      >
        <span className="truncate">{project.name}</span>
        <ChevronDown size={14} className="flex-none text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-slideover">
            <div className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
              Projects
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goto(p.id)}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                    p.id === project.id ? 'bg-[#1f1f25] text-bright' : 'text-ink hover:bg-[#1b1b21]',
                  ].join(' ')}
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === project.id && (
                    <span className="flex-none text-[10px] uppercase tracking-wide text-accent">current</span>
                  )}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              onClick={newProject}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-[#1b1b21] disabled:opacity-60"
            >
              <Plus size={13} />
              New project
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-[#1b1b21]"
            >
              <GridIcon size={12} />
              All projects
            </button>
          </div>
        </>
      )}
    </div>
  );
}
