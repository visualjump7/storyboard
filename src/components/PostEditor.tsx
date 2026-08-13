'use client';

import { useState } from 'react';
import type { PostFields, PostStatus, Scene, SceneMedia } from '@/lib/types';
import { POST_STATUSES, asPostStatus } from '@/lib/types';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { isoToLocalDateInput, isoToLocalTimeInput, localInputsToIso } from '@/lib/pipeline';
import { PLATFORMS, STATUS_META } from './PostBadges';
import { ChevronDown, ChevronRight, Trash } from './icons';
import { MediaStrip } from './MediaStrip';

type PostForm = {
  name: string;
  copy: string;
  prompt: string;
  status: PostStatus;
  platforms: string[];
  scheduledDate: string; // 'YYYY-MM-DD' or ''
  scheduledTime: string; // 'HH:MM' or ''
};

type PostEditorProps = {
  /** The live post. Keyed by post.id by the parent, so navigating to another
   * post remounts this with fresh form state. */
  post: Scene;
  media: SceneMedia[];
  mediaUrls: Record<string, string>;
  uploading: boolean;
  onSaveFields: (id: string, fields: Partial<PostFields>) => void;
  onAddMedia: (post: Scene, files: File[]) => void;
  onRemoveMedia: (post: Scene, media: SceneMedia) => void;
  onReorderMedia: (post: Scene, ordered: SceneMedia[]) => void;
  onDelete: (post: Scene) => void;
};

export function PostEditor({
  post,
  media,
  mediaUrls,
  uploading,
  onSaveFields,
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onDelete,
}: PostEditorProps) {
  const [form, setForm] = useState<PostForm>(() => ({
    name: post.name,
    copy: post.copy,
    prompt: post.prompt,
    status: asPostStatus(post.status),
    platforms: post.platforms,
    scheduledDate: isoToLocalDateInput(post.scheduled_at),
    scheduledTime: isoToLocalTimeInput(post.scheduled_at),
  }));
  const [dirty, setDirty] = useState(false);
  const [promptOpen, setPromptOpen] = useState(() => post.prompt.trim() !== '');

  useDebouncedSave(
    form,
    (value) => {
      onSaveFields(post.id, {
        name: value.name,
        copy: value.copy,
        prompt: value.prompt,
        status: value.status,
        platforms: value.platforms,
        scheduled_at: value.scheduledDate
          ? localInputsToIso(value.scheduledDate, value.scheduledTime)
          : null,
      });
    },
    400,
    dirty,
  );

  function update<K extends keyof PostForm>(field: K, value: PostForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  function togglePlatform(slug: string) {
    const has = form.platforms.includes(slug);
    let next: string[];
    if (has) {
      next = form.platforms.filter((p) => p !== slug);
    } else {
      // Known slugs in canonical order; CLI-added slugs outside the pill set
      // (e.g. "threads") are preserved at the end, never silently dropped.
      const known = PLATFORMS.map((p) => p.slug).filter(
        (s) => form.platforms.includes(s) || s === slug,
      );
      const custom = form.platforms.filter((s) => !PLATFORMS.some((p) => p.slug === s));
      next = [...known, ...custom];
    }
    update('platforms', next);
  }

  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-8 pt-5">
      <MediaStrip
        media={media}
        mediaUrls={mediaUrls}
        uploading={uploading}
        onAddFiles={(files) => onAddMedia(post, files)}
        onRemove={(item) => onRemoveMedia(post, item)}
        onReorder={(ordered) => onReorderMedia(post, ordered)}
      />

      {/* Post name */}
      <Field label="Post name" className="mt-[22px]">
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Untitled post"
          className="h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[15px] font-medium text-bright outline-none transition-colors focus:border-accent"
        />
      </Field>

      {/* Copy — the post text itself */}
      <div className="mt-[18px]">
        <div className="mb-2 flex items-center gap-[7px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
            Copy
          </span>
          <span className="text-[10.5px] text-[#52525a]">post text — adapted per platform later</span>
        </div>
        <textarea
          value={form.copy}
          onChange={(e) => update('copy', e.target.value)}
          placeholder={'Write the post…'}
          className="min-h-[180px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
      </div>

      {/* Platforms */}
      <Field label="Platforms" className="mt-[18px]">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const on = form.platforms.includes(p.slug);
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => togglePlatform(p.slug)}
                aria-pressed={on}
                className={[
                  'flex h-[30px] items-center rounded-lg border px-3 text-[12.5px] font-medium transition-colors',
                  on
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-[#30303a] bg-[#1f1f25] text-muted hover:bg-[#27272e] hover:text-ink',
                ].join(' ')}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Status + schedule */}
      <div className="mt-[18px] grid grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as PostStatus)}
            className="h-[38px] w-full cursor-pointer rounded-[9px] border border-line-2 bg-field px-3 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Schedule"
          trailing={
            form.scheduledDate ? (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, scheduledDate: '', scheduledTime: '' }));
                  setDirty(true);
                }}
                className="text-[10.5px] text-muted underline underline-offset-2 transition-colors hover:text-ink"
              >
                Clear
              </button>
            ) : undefined
          }
        >
          <div className="flex gap-2">
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => update('scheduledDate', e.target.value)}
              aria-label="Schedule date"
              className="h-[38px] min-w-0 flex-1 rounded-[9px] border border-line-2 bg-field px-2.5 text-[12.5px] text-[#d6d6db] outline-none transition-colors [color-scheme:dark] focus:border-accent"
            />
            <input
              type="time"
              value={form.scheduledTime}
              onChange={(e) => update('scheduledTime', e.target.value)}
              disabled={!form.scheduledDate}
              aria-label="Schedule time"
              className="h-[38px] w-[92px] flex-none rounded-[9px] border border-line-2 bg-field px-2 text-[12.5px] text-[#d6d6db] outline-none transition-colors [color-scheme:dark] focus:border-accent disabled:opacity-40"
            />
          </div>
        </Field>
      </div>

      {/* Generation prompt (secondary, collapsed when empty) */}
      <div className="mt-[18px]">
        <button
          type="button"
          onClick={() => setPromptOpen((v) => !v)}
          aria-expanded={promptOpen}
          className="mb-2 flex items-center gap-[7px] text-muted transition-colors hover:text-ink"
        >
          {promptOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em]">
            Generation prompt
          </span>
          <span className="text-[10.5px] normal-case tracking-normal text-[#52525a]">
            for rendering the media elsewhere
          </span>
        </button>
        {promptOpen && (
          <textarea
            value={form.prompt}
            onChange={(e) => update('prompt', e.target.value)}
            placeholder="Describe how this post’s media should be rendered…"
            className="min-h-[88px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Delete this post? This cannot be undone.')) onDelete(post);
        }}
        className="mt-6 flex h-[34px] items-center gap-[7px] rounded-lg border border-[#34242a] px-[13px] text-[12.5px] text-[#c96a6a] transition-colors hover:border-[#4a2a30] hover:bg-[#251618]"
      >
        <Trash size={13} />
        Delete post
      </button>
    </div>
  );
}

function Field({
  label,
  className,
  trailing,
  children,
}: {
  label: string;
  className?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          {label}
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}
