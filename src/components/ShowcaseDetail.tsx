'use client';

import { useEffect, useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import {
  SHOWCASE_META,
  SHOWCASE_STATUS_LABELS,
  asShowcaseStatus,
  type GameStatus,
  type MusicStatus,
  type Scene,
  type SceneMedia,
  type ShowcaseFields,
  type ShowcaseKind,
} from '@/lib/types';
import { ChevronLeft, ChevronRight, Close, Trash } from './icons';
import { MediaStrip } from './MediaStrip';

const INPUT =
  'h-[40px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[14px] text-[#d6d6db] outline-none transition-colors focus:border-accent';

type ShowcaseDetailProps = {
  kind: ShowcaseKind;
  item: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSaveFields: (id: string, fields: Partial<ShowcaseFields>) => void;
  onAddMedia: (item: Scene, files: File[]) => void;
  onRemoveMedia: (item: Scene, media: SceneMedia) => void;
  onReorderMedia: (item: Scene, ordered: SceneMedia[]) => void;
  onDelete: (item: Scene) => void;
};

type ShowcaseForm = {
  name: string;
  description: string;
  status: GameStatus | MusicStatus;
  link_url: string;
};

export function ShowcaseDetail({
  kind,
  item,
  media,
  mediaUrls,
  uploading,
  onClose,
  onPrev,
  onNext,
  onSaveFields,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onDelete,
}: ShowcaseDetailProps) {
  const meta = SHOWCASE_META[kind];

  // ← / → step items, Esc closes. Arrows are ignored while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(6,6,8,0.72)] backdrop-blur-[3px]" />

      <div className="absolute bottom-0 right-0 top-0 flex w-[560px] max-w-[92vw] flex-col border-l border-[#2a2a32] bg-surface shadow-slideover">
        <div className="flex h-[60px] flex-none items-center gap-3 border-b border-[#24242b] px-5">
          <span className="flex h-[22px] items-center rounded border border-[#32323c] bg-[#22222a] px-2 text-[10.5px] font-medium uppercase tracking-wide text-[#b4b4be]">
            {SHOWCASE_STATUS_LABELS[asShowcaseStatus(kind, item.status)]}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <HeaderButton label={`Previous ${meta.noun.one}`} onClick={onPrev}>
              <ChevronLeft size={16} />
            </HeaderButton>
            <HeaderButton label={`Next ${meta.noun.one}`} onClick={onNext}>
              <ChevronRight size={16} />
            </HeaderButton>
            <div className="mx-1 h-[22px] w-px bg-[#2c2c34]" />
            <HeaderButton label="Close" onClick={onClose} hoverWhite>
              <Close size={16} />
            </HeaderButton>
          </div>
        </div>

        {/* Keyed so stepping between items resets the form cleanly. */}
        <ShowcaseEditor
          key={item.id}
          kind={kind}
          item={item}
          media={media}
          mediaUrls={mediaUrls}
          uploading={uploading}
          onSaveFields={onSaveFields}
          onAddMedia={onAddMedia}
          onRemoveMedia={onRemoveMedia}
          onReorderMedia={onReorderMedia}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function ShowcaseEditor({
  kind,
  item,
  media,
  mediaUrls,
  uploading,
  onSaveFields,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onDelete,
}: {
  kind: ShowcaseKind;
  item: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onSaveFields: (id: string, fields: Partial<ShowcaseFields>) => void;
  onAddMedia: (item: Scene, files: File[]) => void;
  onRemoveMedia: (item: Scene, media: SceneMedia) => void;
  onReorderMedia: (item: Scene, ordered: SceneMedia[]) => void;
  onDelete: (item: Scene) => void;
}) {
  const meta = SHOWCASE_META[kind];
  const [form, setForm] = useState<ShowcaseForm>({
    name: item.name,
    description: item.description,
    status: asShowcaseStatus(kind, item.status),
    link_url: item.link_url ?? '',
  });
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(
    form,
    (value) => {
      onSaveFields(item.id, {
        name: value.name,
        description: value.description,
        status: value.status,
        link_url: value.link_url.trim(),
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof ShowcaseForm>(field: K, value: ShowcaseForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  const link = form.link_url.trim();
  const linkIsHttp = /^https?:\/\//i.test(link);

  // Music: play the audio right here rather than only in the lightbox.
  const audio = media.filter((m) => m.kind === 'audio');

  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-8 pt-5">
      <MediaStrip
        media={media}
        mediaUrls={mediaUrls}
        uploading={uploading}
        onAddFiles={(files) => onAddMedia(item, files)}
        onRemove={(m) => onRemoveMedia(item, m)}
        onReorder={(ordered) => onReorderMedia(item, ordered)}
      />

      {audio.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {audio.map((track) =>
            mediaUrls[track.path] ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio key={track.id} controls preload="metadata" src={mediaUrls[track.path]} className="w-full" />
            ) : null,
          )}
        </div>
      )}

      <Field label={`${meta.noun.one === 'track' ? 'Track' : 'Game'} name`} className="mt-[22px]">
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder={meta.noun.one === 'track' ? 'Track title' : 'Game title'}
          className={INPUT}
        />
      </Field>

      <Field label="Summary" className="mt-[18px]">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder={
            meta.noun.one === 'track'
              ? 'Mood, instrumentation, who it’s for, release notes…'
              : 'What the game is, how it plays, what’s in this build…'
          }
          className="min-h-[140px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
      </Field>

      <Field label={meta.linkLabel} className="mt-[18px]">
        <input
          value={form.link_url}
          onChange={(e) => update('link_url', e.target.value)}
          placeholder={meta.linkPlaceholder}
          inputMode="url"
          className={INPUT}
        />
        {link && linkIsHttp && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-[11.5px] text-accent underline underline-offset-2 hover:opacity-80"
          >
            {meta.openLabel} ↗
          </a>
        )}
      </Field>

      <Field label="Stage" className="mt-[18px]">
        <select
          value={form.status}
          onChange={(e) => update('status', e.target.value as GameStatus | MusicStatus)}
          className={`${INPUT} cursor-pointer`}
        >
          {meta.statuses.map((s) => (
            <option key={s} value={s}>
              {SHOWCASE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="button"
        onClick={() => onDelete(item)}
        className="mt-8 flex h-[36px] items-center gap-[6px] rounded-lg border border-[#4a2a30] bg-[#251618] px-3.5 text-[12.5px] font-medium text-[#c96a6a] transition-colors hover:bg-[#2d1a1d]"
      >
        <Trash size={12} />
        Delete {meta.noun.one}
      </button>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function HeaderButton({
  label,
  onClick,
  hoverWhite,
  children,
}: {
  label: string;
  onClick: () => void;
  hoverWhite?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e2e38] bg-[#1d1d23] text-[#c4c4cc] transition-colors hover:bg-[#26262e]',
        hoverWhite ? 'bg-transparent hover:text-white' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
