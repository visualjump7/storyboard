'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createProject } from '@/lib/projects';
import type { Project, Workspace } from '@/lib/types';
import { ChevronDown, Folder, GridIcon, Plus } from './icons';

type ProjectSwitcherProps = {
  supabase: SupabaseClient;
  userId: string;
  project: Project;
  /** The project's siblings — every project in the same workspace, and only those. */
  projects: Project[];
  /** The workspace the project is filed under; null for an unfiled project. */
  workspace: Workspace | null;
  /** Every workspace, so the other worlds are one click away. */
  workspaces: Workspace[];
};

/**
 * Toolbar dropdown: shows the current project, switches between the projects
 * of the SAME workspace, creates a new sibling, jumps to another workspace, or
 * steps back up to the workspace index. It never lists another workspace's
 * projects — that separation is the point of workspaces; switching worlds is
 * an explicit step, not a scroll.
 */
export function ProjectSwitcher({
  supabase,
  userId,
  project,
  projects,
  workspace,
  workspaces,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fall back to the current project if the list hasn't loaded yet.
  const list = projects.length ? projects : [project];
  const otherWorkspaces = workspaces.filter((w) => w.id !== workspace?.id);

  async function newProject() {
    // An unfiled project has no workspace to create a sibling in — send the
    // user to the index instead, where the project can be filed first.
    if (!workspace) {
      setOpen(false);
      router.push('/');
      return;
    }
    setBusy(true);
    try {
      const p = await createProject(supabase, userId, workspace.id, 'Untitled project');
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

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-[#1b1b21] disabled:opacity-60';
  const sectionClass =
    'truncate px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted';

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
            <div className={sectionClass}>{workspace ? workspace.name : 'Unfiled'}</div>
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
            <button type="button" onClick={newProject} disabled={busy} className={itemClass}>
              <Plus size={13} />
              New project{workspace ? ` in ${workspace.name}` : ''}
            </button>
            {workspace && (
              <button type="button" onClick={() => go(`/w/${workspace.id}`)} className={itemClass}>
                <GridIcon size={12} />
                <span className="truncate">All {workspace.name} projects</span>
              </button>
            )}

            {otherWorkspaces.length > 0 && (
              <>
                <div className="my-1 h-px bg-line" />
                <div className={sectionClass}>Switch workspace</div>
                {otherWorkspaces.map((w) => (
                  <button key={w.id} type="button" onClick={() => go(`/w/${w.id}`)} className={itemClass}>
                    <Folder size={12} />
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
              </>
            )}

            <div className="my-1 h-px bg-line" />
            <button type="button" onClick={() => go('/')} className={itemClass}>
              <Folder size={12} />
              All workspaces
            </button>
          </div>
        </>
      )}
    </div>
  );
}
