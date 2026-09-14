import type { SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import type { Project, Workspace } from '@/lib/types';
import { Camera, ChevronRight, GridIcon, Plus, ScriptLines, SignOut } from './icons';
import { ProjectSwitcher } from './ProjectSwitcher';

type ToolbarProps = {
  supabase: SupabaseClient;
  userId: string;
  project: Project;
  projects: Project[];
  /** The workspace this board is filed under; null for an unfiled project. */
  workspace: Workspace | null;
  /** Every workspace, for the switcher's "Switch workspace" section. */
  workspaces: Workspace[];
  sceneCount: number;
  cardSize: number;
  minSize: number;
  maxSize: number;
  onCardSize: (value: number) => void;
  onAddScene: () => void;
  scriptOpen: boolean;
  onToggleScript: () => void;
  onSignOut: () => void;
};

export function Toolbar({
  supabase,
  userId,
  project,
  projects,
  workspace,
  workspaces,
  sceneCount,
  cardSize,
  minSize,
  maxSize,
  onCardSize,
  onAddScene,
  scriptOpen,
  onToggleScript,
  onSignOut,
}: ToolbarProps) {
  return (
    <div className="z-10 flex h-[60px] flex-none items-center gap-5 border-b border-line bg-surface px-[22px]">
      {/* Brand › workspace › project switcher */}
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          aria-label="All workspaces"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas"
        >
          S
        </Link>
        {workspace && (
          <>
            <Link
              href={`/w/${workspace.id}`}
              className="hidden max-w-[160px] truncate text-[13px] text-muted hover:text-ink md:inline"
            >
              {workspace.name}
            </Link>
            <ChevronRight size={13} className="hidden flex-none text-[#4a4a54] md:inline" />
          </>
        )}
        <ProjectSwitcher
          supabase={supabase}
          userId={userId}
          project={project}
          projects={projects}
          workspace={workspace}
          workspaces={workspaces}
        />
        <span className="ml-0.5 text-[12.5px] text-muted">
          {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Thumbnail size slider */}
      <div className="flex items-center gap-2.5">
        <GridIcon size={13} className="text-muted" />
        <input
          type="range"
          min={minSize}
          max={maxSize}
          step={2}
          value={cardSize}
          onChange={(e) => onCardSize(Number(e.target.value))}
          aria-label="Thumbnail size"
          className="w-[130px] cursor-pointer"
        />
        <GridIcon size={19} className="text-muted" />
      </div>

      <div className="h-6 w-px bg-[#2a2a32]" />

      <Link
        href={`/camera-references?project=${encodeURIComponent(project.id)}`}
        aria-label="Camera References"
        title="Camera References"
        className="flex h-[34px] flex-none items-center gap-[7px] rounded-lg border border-accent/25 bg-accent/10 px-2.5 text-[13px] font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent xl:px-3.5"
      >
        <Camera size={15} />
        <span className="hidden xl:inline">Camera References</span>
      </Link>

      <button
        type="button"
        onClick={onAddScene}
        className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#30303a] bg-[#1f1f25] px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-[#27272e]"
      >
        <Plus size={14} />
        Add scene
      </button>

      <button
        type="button"
        onClick={onToggleScript}
        aria-pressed={scriptOpen}
        className={[
          'flex h-[34px] items-center gap-[7px] rounded-lg border px-3.5 text-[13px] font-medium transition-colors',
          scriptOpen
            ? 'border-accent bg-accent text-canvas'
            : 'border-[#30303a] bg-[#1f1f25] text-ink hover:bg-[#27272e]',
        ].join(' ')}
      >
        <ScriptLines size={14} />
        Script
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
