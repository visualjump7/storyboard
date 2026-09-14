'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { moveProject } from '@/lib/projects';
import { createWorkspace, deleteWorkspace, renameWorkspace } from '@/lib/workspaces';
import { KIND_LABELS, type ProjectKind, type Workspace } from '@/lib/types';
import { Camera, Folder, Pencil, Plus, SignOut, Trash } from './icons';

/** The slice of a project the index needs — counts, chips, and the unfiled list. */
export type ProjectSummary = {
  id: string;
  name: string;
  kind: ProjectKind;
  workspace_id: string | null;
};

type WorkspacesHomeProps = {
  userId: string;
  initialWorkspaces: Workspace[];
  projects: ProjectSummary[];
};

/**
 * The top level of the app: one card per workspace (Phantom Ranch, Roaring
 * Pines…). A workspace is a compartment — opening one shows only its own
 * projects. Projects that predate the workspace layer, or were created by an
 * older CLI without one, surface in an "Unfiled" list so nothing is ever
 * unreachable.
 */
export function WorkspacesHome({ userId, initialWorkspaces, projects }: WorkspacesHomeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  // Re-sync from the server after router.refresh(), so a delete the server
  // refused (the workspace gained a project meanwhile) reappears.
  useEffect(() => setWorkspaces(initialWorkspaces), [initialWorkspaces]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byWorkspace = useMemo(() => {
    const map: Record<string, ProjectSummary[]> = {};
    for (const p of projects) {
      if (p.workspace_id) (map[p.workspace_id] ??= []).push(p);
    }
    return map;
  }, [projects]);
  const unfiled = useMemo(() => projects.filter((p) => !p.workspace_id), [projects]);

  async function handleNew() {
    const name = window.prompt('New workspace name', '');
    if (name == null) return;
    setBusy(true);
    setError(null);
    try {
      const w = await createWorkspace(supabase, userId, name);
      router.push(`/w/${w.id}`);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to create workspace.');
      setBusy(false);
    }
  }

  async function handleRename(w: Workspace) {
    const name = window.prompt('Rename workspace', w.name);
    if (name == null) return;
    const next = name.trim() || w.name;
    setWorkspaces((prev) => prev.map((x) => (x.id === w.id ? { ...x, name: next } : x)));
    try {
      await renameWorkspace(supabase, w.id, next);
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to rename workspace.');
    }
  }

  async function handleDelete(w: Workspace) {
    const held = byWorkspace[w.id]?.length ?? 0;
    if (held > 0) {
      setError(
        `"${w.name}" still holds ${held} project${held === 1 ? '' : 's'}. Move or delete them first — a workspace is only deleted when it is empty.`,
      );
      return;
    }
    if (!window.confirm(`Delete the empty workspace "${w.name}"?`)) return;
    setWorkspaces((prev) => prev.filter((x) => x.id !== w.id));
    try {
      await deleteWorkspace(supabase, w.id);
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete workspace.');
      router.refresh();
    }
  }

  async function handleFile(projectId: string, workspaceId: string) {
    setError(null);
    try {
      await moveProject(supabase, projectId, workspaceId);
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to move project.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="flex h-[60px] items-center gap-[11px] border-b border-line bg-surface px-[22px]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas">
          S
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Storyboard</span>
        <div className="flex-1" />
        <Link
          href="/camera-references"
          className="flex h-[34px] flex-none items-center gap-[7px] rounded-lg border border-accent/25 bg-accent/10 px-3 text-[12px] font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3.5 sm:text-[13px]"
        >
          <Camera size={15} />
          Camera References
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#30303a] bg-[#1f1f25] text-muted transition-colors hover:bg-[#27272e] hover:text-ink"
        >
          <SignOut size={15} />
        </button>
      </div>

      {error && (
        <div className="border-b border-[#4a2a30] bg-[#251618] px-[22px] py-2 text-[12.5px] text-[#e0a0a0]">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 underline underline-offset-2 hover:text-white"
          >
            dismiss
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[1100px] px-[22px] py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em]">
            Workspaces
            <span className="ml-2 text-[13px] font-normal text-muted">
              {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          </h1>
          <button
            type="button"
            onClick={handleNew}
            disabled={busy}
            className="flex h-[36px] items-center gap-[7px] rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={14} />
            New workspace
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#303039] bg-well py-20 text-center">
            <div className="text-[14px] font-medium text-[#a6a6ae]">No workspaces yet</div>
            <div className="mt-1 text-[12.5px] text-muted">
              A workspace holds everything for one world or client — its boards, pipelines, and merch.
            </div>
            <button
              type="button"
              onClick={handleNew}
              disabled={busy}
              className="mt-4 flex h-[36px] items-center gap-[7px] rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} />
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
            {workspaces.map((w) => {
              const held = byWorkspace[w.id] ?? [];
              const kinds = [...new Set(held.map((p) => p.kind))];
              return (
                <div
                  key={w.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/w/${w.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/w/${w.id}`);
                    }
                  }}
                  className="group relative flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-xl border border-line-2 bg-surface p-4 outline-none transition-colors hover:border-[#3a3a44] focus-visible:border-accent"
                >
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label="Rename workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRename(w);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(w);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#c96a6a] backdrop-blur transition-colors hover:text-[#e08585]"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                  <div className="absolute left-4 top-4 text-muted">
                    <Folder size={22} />
                  </div>
                  <div className="text-[17px] font-semibold tracking-[-0.01em] text-bright">{w.name}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    {held.length} {held.length === 1 ? 'project' : 'projects'}
                  </div>
                  {kinds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {kinds.map((k) => (
                        <span
                          key={k}
                          className="inline-flex h-[18px] items-center rounded border border-line-2 bg-field px-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted"
                        >
                          {KIND_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {unfiled.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-muted">
              Unfiled
              <span className="ml-2 font-normal normal-case tracking-normal text-[#54545e]">
                {unfiled.length} — not in any workspace yet
              </span>
            </h2>
            <div className="divide-y divide-line rounded-xl border border-line-2 bg-surface">
              {unfiled.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Link href={`/p/${p.id}`} className="min-w-0 flex-1 truncate text-[13.5px] text-bright hover:underline">
                    {p.name || 'Untitled project'}
                  </Link>
                  <span className="flex-none text-[10.5px] uppercase tracking-wide text-muted">
                    {KIND_LABELS[p.kind]}
                  </span>
                  {workspaces.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) void handleFile(p.id, e.target.value);
                      }}
                      className="h-[30px] flex-none cursor-pointer rounded-lg border border-line-2 bg-field px-2 text-[12px] text-ink outline-none focus:border-accent"
                    >
                      <option value="" disabled>
                        File under…
                      </option>
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
