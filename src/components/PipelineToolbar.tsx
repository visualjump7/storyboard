'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { Check, GridIcon, LinkIcon, Plus, ScriptLines, SignOut } from './icons';
import { ProjectSwitcher } from './ProjectSwitcher';

type PipelineToolbarProps = {
  supabase: SupabaseClient;
  userId: string;
  project: Project;
  projects: Project[];
  postCount: number;
  cardSize: number;
  minSize: number;
  maxSize: number;
  onCardSize: (value: number) => void;
  onAddPost: () => void;
  notesOpen: boolean;
  onToggleNotes: () => void;
  shareCopied: boolean;
  onCopyShareLink: () => void;
  onSignOut: () => void;
  /** What a row is called here. Defaults to post/posts. */
  noun?: { one: string; many: string };
  /** Label for the add button. Defaults to 'Add post'. */
  addLabel?: string;
  /** Boards with fixed-width columns (merchandise) hide the size slider. */
  showCardSize?: boolean;
};

export function PipelineToolbar({
  supabase,
  userId,
  project,
  projects,
  postCount,
  cardSize,
  minSize,
  maxSize,
  onCardSize,
  onAddPost,
  notesOpen,
  onToggleNotes,
  shareCopied,
  onCopyShareLink,
  onSignOut,
  noun = { one: 'post', many: 'posts' },
  addLabel = 'Add post',
  showCardSize = true,
}: PipelineToolbarProps) {
  return (
    <div className="z-10 flex h-[60px] flex-none items-center gap-5 border-b border-line bg-surface px-[22px]">
      {/* Brand + project switcher */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="All projects"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas"
        >
          S
        </Link>
        <ProjectSwitcher supabase={supabase} userId={userId} project={project} projects={projects} />
        <span className="ml-0.5 text-[12.5px] text-muted">
          {postCount} {postCount === 1 ? noun.one : noun.many}
        </span>
      </div>

      <div className="flex-1" />

      {/* Card size slider */}
      {showCardSize && (
        <>
          <div className="flex items-center gap-2.5">
            <GridIcon size={13} className="text-muted" />
            <input
              type="range"
              min={minSize}
              max={maxSize}
              step={2}
              value={cardSize}
              onChange={(e) => onCardSize(Number(e.target.value))}
              aria-label="Card size"
              className="w-[130px] cursor-pointer"
            />
            <GridIcon size={19} className="text-muted" />
          </div>

          <div className="h-6 w-px bg-[#2a2a32]" />
        </>
      )}

      <button
        type="button"
        onClick={onAddPost}
        className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#30303a] bg-[#1f1f25] px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-[#27272e]"
      >
        <Plus size={14} />
        {addLabel}
      </button>

      <button
        type="button"
        onClick={onToggleNotes}
        aria-pressed={notesOpen}
        className={[
          'flex h-[34px] items-center gap-[7px] rounded-lg border px-3.5 text-[13px] font-medium transition-colors',
          notesOpen
            ? 'border-accent bg-accent text-canvas'
            : 'border-[#30303a] bg-[#1f1f25] text-ink hover:bg-[#27272e]',
        ].join(' ')}
      >
        <ScriptLines size={14} />
        Notes
      </button>

      <button
        type="button"
        onClick={onCopyShareLink}
        title="Copy the read-only share link"
        className={[
          'flex h-[34px] items-center gap-[7px] rounded-lg border px-3.5 text-[13px] font-medium transition-colors',
          shareCopied
            ? 'border-[#30303a] bg-[#1f1f25] text-accent'
            : 'border-[#30303a] bg-[#1f1f25] text-ink hover:bg-[#27272e]',
        ].join(' ')}
      >
        {shareCopied ? <Check size={14} /> : <LinkIcon size={13} />}
        {shareCopied ? 'Copied' : 'Share'}
      </button>

      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#30303a] bg-[#1f1f25] text-muted transition-colors hover:bg-[#27272e] hover:text-ink"
      >
        <SignOut size={15} />
      </button>
    </div>
  );
}
