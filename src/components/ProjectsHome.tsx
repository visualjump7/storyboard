'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProject, deleteProject, renameProject } from '@/lib/projects';
import type { Project } from '@/lib/types';
import { Pencil, Plus, SignOut, Trash } from './icons';

type ProjectsHomeProps = {
  userId: string;
  initialProjects: Project[];
};

export function ProjectsHome({ userId, initialProjects }: ProjectsHomeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNew() {
    setBusy(true);
    setError(null);
    try {
      const p = await createProject(supabase, userId, 'Untitled project');
      router.push(`/p/${p.id}`);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to create project.');
      setBusy(false);
    }
  }

  async function handleRename(p: Project) {
    const name = window.prompt('Rename project', p.name);
    if (name == null) return;
    const next = name.trim() || p.name;
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: next } : x)));
    try {
      await renameProject(supabase, p.id, next);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to rename project.');
    }
  }

  async function handleDelete(p: Project) {
    if (
      !window.confirm(
        `Delete "${p.name}"? This permanently deletes its scenes, images, and script. This cannot be undone.`,
      )
    )
      return;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await deleteProject(supabase, p);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete project.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {/* Header */}
      <div className="flex h-[60px] items-center gap-[11px] border-b border-line bg-surface px-[22px]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas">
          S
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Storyboard</span>
        <div className="flex-1" />
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
            Projects
            <span className="ml-2 text-[13px] font-normal text-muted">
              {projects.length} {projects.length === 1 ? 'storyboard' : 'storyboards'}
            </span>
          </h1>
          <button
            type="button"
            onClick={handleNew}
            disabled={busy}
            className="flex h-[36px] items-center gap-[7px] rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={14} />
            New project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#303039] bg-well py-20 text-center">
            <div className="text-[14px] font-medium text-[#a6a6ae]">No projects yet</div>
            <div className="mt-1 text-[12.5px] text-muted">
              Create your first storyboard to get started.
            </div>
            <button
              type="button"
              onClick={handleNew}
              disabled={busy}
              className="mt-4 flex h-[36px] items-center gap-[7px] rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} />
              New project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {projects.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/p/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/p/${p.id}`);
                  }
                }}
                className="group relative flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-xl border border-line-2 bg-surface p-4 outline-none transition-colors hover:border-[#3a3a44] focus-visible:border-accent"
              >
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Rename project"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRename(p);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete project"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(p);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#c96a6a] backdrop-blur transition-colors hover:text-[#e08585]"
                  >
                    <Trash size={12} />
                  </button>
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-bright">{p.name}</div>
                {p.description && (
                  <div className="mt-1 line-clamp-2 text-[12px] text-muted">{p.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
