'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProject, deleteProject, moveProject, renameProject } from '@/lib/projects';
import { formatNextDate } from '@/lib/pipeline';
import { KIND_LABELS, type Project, type ProjectKind, type Workspace } from '@/lib/types';
import {
  Camera,
  ChevronRight,
  FolderMove,
  Gamepad,
  GridIcon,
  Note,
  Pencil,
  Plus,
  ScriptLines,
  SignOut,
  Tag,
  Trash,
} from './icons';

type ProjectsHomeProps = {
  userId: string;
  /** The workspace being viewed. Every project shown belongs to it. */
  workspace: Workspace;
  /** All workspaces, for the "Move to…" menu. */
  workspaces: Workspace[];
  initialProjects: Project[];
  /** projectId -> ISO of the next upcoming scheduled post (social projects). */
  nextScheduled?: Record<string, string>;
};

/**
 * One workspace's projects. Rendered with key={workspace.id} by the route so
 * switching workspaces remounts it with fresh state rather than reusing a
 * stale list; mutations call router.refresh() for the same reason.
 */
export function ProjectsHome({
  userId,
  workspace,
  workspaces,
  initialProjects,
  nextScheduled = {},
}: ProjectsHomeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  // Re-sync from the server after router.refresh(): an optimistic removal that
  // the server then rejected (e.g. a move to a workspace deleted meanwhile)
  // would otherwise stay hidden until a full reload.
  useEffect(() => setProjects(initialProjects), [initialProjects]);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState<'header' | 'empty' | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otherWorkspaces = useMemo(
    () => workspaces.filter((w) => w.id !== workspace.id),
    [workspaces, workspace.id],
  );

  async function handleNew(kind: ProjectKind) {
    setMenuOpen(null);
    setBusy(true);
    setError(null);
    try {
      const p = await createProject(supabase, userId, workspace.id, 'Untitled project', kind);
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
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to rename project.');
    }
  }

  async function handleMove(p: Project, target: Workspace) {
    setMoveFor(null);
    if (
      !window.confirm(
        `Move "${p.name}" to ${target.name}? Its share link keeps working; it just files under ${target.name} from now on.`,
      )
    )
      return;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await moveProject(supabase, p.id, target.id);
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to move project.');
      router.refresh();
    }
  }

  async function handleDelete(p: Project) {
    const what =
      p.kind === 'social'
        ? 'its posts, media, and notes'
        : p.kind === 'merchandise'
          ? 'its products, images, quotes, and orders'
          : p.kind === 'game' || p.kind === 'music'
            ? 'its items, media, and notes'
            : 'its scenes, images, clips, and script';
    if (
      !window.confirm(`Delete "${p.name}"? This permanently deletes ${what}. This cannot be undone.`)
    )
      return;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await deleteProject(supabase, p);
      router.refresh();
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
      {/* Header: breadcrumb back to the workspace index */}
      <div className="flex h-[60px] items-center gap-[11px] border-b border-line bg-surface px-[22px]">
        <Link
          href="/"
          aria-label="All workspaces"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas"
        >
          S
        </Link>
        <Link href="/" className="text-[13px] text-muted hover:text-ink">
          Workspaces
        </Link>
        <ChevronRight size={13} className="flex-none text-[#4a4a54]" />
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{workspace.name}</span>
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
            {workspace.name}
            <span className="ml-2 text-[13px] font-normal text-muted">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </h1>
          <NewProjectButton
            open={menuOpen === 'header'}
            busy={busy}
            onToggle={() => setMenuOpen((m) => (m === 'header' ? null : 'header'))}
            onClose={() => setMenuOpen(null)}
            onPick={handleNew}
          />
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#303039] bg-well py-20 text-center">
            <div className="text-[14px] font-medium text-[#a6a6ae]">No projects in {workspace.name} yet</div>
            <div className="mt-1 text-[12.5px] text-muted">
              Add a storyboard, social pipeline, merchandise board, game, or music project.
            </div>
            <div className="mt-4">
              <NewProjectButton
                open={menuOpen === 'empty'}
                busy={busy}
                onToggle={() => setMenuOpen((m) => (m === 'empty' ? null : 'empty'))}
                onClose={() => setMenuOpen(null)}
                onPick={handleNew}
              />
            </div>
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
                className={[
                  // No overflow-hidden: the Move menu must be able to extend past
                  // the card. The open card is lifted above its later siblings
                  // so they don't paint over the menu.
                  'group relative flex aspect-[4/3] cursor-pointer flex-col justify-end rounded-xl border border-line-2 bg-surface p-4 outline-none transition-colors hover:border-[#3a3a44] focus-visible:border-accent',
                  moveFor === p.id ? 'z-40' : '',
                ].join(' ')}
              >
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {otherWorkspaces.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Move to another workspace"
                        title="Move to another workspace"
                        aria-expanded={moveFor === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveFor((cur) => (cur === p.id ? null : p.id));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
                      >
                        <FolderMove size={12} />
                      </button>
                      {moveFor === p.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveFor(null);
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-[32px] z-30 w-[200px] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-slideover"
                          >
                            <div className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
                              Move to
                            </div>
                            {otherWorkspaces.map((w) => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleMove(p, w);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-[#1b1b21]"
                              >
                                <span className="truncate">{w.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
                <div className="mb-1.5">
                  <span
                    className={[
                      'inline-flex h-[18px] items-center rounded px-1.5 text-[9.5px] font-semibold uppercase tracking-wide',
                      p.kind === 'social'
                        ? 'bg-accent/15 text-accent'
                        : 'border border-line-2 bg-field text-muted',
                    ].join(' ')}
                  >
                    {KIND_LABELS[p.kind] ?? 'Storyboard'}
                  </span>
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-bright">{p.name}</div>
                {p.kind === 'social' && nextScheduled[p.id] ? (
                  <div className="mt-1 text-[11.5px] text-muted">
                    Next: {formatNextDate(nextScheduled[p.id])}
                  </div>
                ) : (
                  p.description && (
                    <div className="mt-1 line-clamp-2 text-[12px] text-muted">{p.description}</div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewProjectButton({
  open,
  busy,
  onToggle,
  onClose,
  onPick,
}: {
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (kind: ProjectKind) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-expanded={open}
        className="flex h-[36px] items-center gap-[7px] rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Plus size={14} />
        New project
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={onClose} />
          <div className="absolute right-0 top-[42px] z-30 w-[260px] overflow-hidden rounded-xl border border-line bg-surface shadow-slideover">
            <button
              type="button"
              onClick={() => onPick('storyboard')}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a20]"
            >
              <GridIcon size={15} className="mt-0.5 flex-none text-muted" />
              <span>
                <span className="block text-[13.5px] font-medium text-bright">Storyboard</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                  Film scenes with prompts and frames
                </span>
              </span>
            </button>
            <div className="h-px bg-line" />
            <button
              type="button"
              onClick={() => onPick('social')}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a20]"
            >
              <ScriptLines size={15} className="mt-0.5 flex-none text-muted" />
              <span>
                <span className="block text-[13.5px] font-medium text-bright">Social pipeline</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                  Posts with copy, media, schedule, and status
                </span>
              </span>
            </button>
            <div className="h-px bg-line" />
            <button
              type="button"
              onClick={() => onPick('merchandise')}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a20]"
            >
              <Tag size={15} className="mt-0.5 flex-none text-muted" />
              <span>
                <span className="block text-[13.5px] font-medium text-bright">Merchandise</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                  Products with images, supplier, cost, and margin
                </span>
              </span>
            </button>
            <div className="h-px bg-line" />
            <button
              type="button"
              onClick={() => onPick('game')}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a20]"
            >
              <Gamepad size={15} className="mt-0.5 flex-none text-muted" />
              <span>
                <span className="block text-[13.5px] font-medium text-bright">Games</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                  Playable games with screenshots and a play link
                </span>
              </span>
            </button>
            <div className="h-px bg-line" />
            <button
              type="button"
              onClick={() => onPick('music')}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a20]"
            >
              <Note size={15} className="mt-0.5 flex-none text-muted" />
              <span>
                <span className="block text-[13.5px] font-medium text-bright">Music</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                  Tracks with audio, cover art, and a listen link
                </span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
