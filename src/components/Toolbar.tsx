import { GridIcon, Plus, ScriptLines, SignOut } from './icons';

type ToolbarProps = {
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
      {/* Brand */}
      <div className="flex items-center gap-[11px]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[14px] font-bold text-canvas">
          S
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Storyboard</span>
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
