'use client';

import { useRef, useState } from 'react';
import type { Scene, SceneTextFields } from '@/lib/types';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { Download, Spinner, Trash, Upload } from './icons';

type SceneEditorProps = {
  /** The live scene. Keyed by scene.id by the parent, so navigating to another
   * scene remounts this with fresh form state. */
  scene: Scene;
  imageUrl?: string;
  onSaveFields: (id: string, fields: SceneTextFields) => void;
  onUploadImage: (scene: Scene, file: File) => Promise<void>;
  onRemoveImage: (scene: Scene) => Promise<void>;
  onDownloadImage: (scene: Scene) => Promise<void>;
  onDelete: (scene: Scene) => void;
};

export function SceneEditor({
  scene,
  imageUrl,
  onSaveFields,
  onUploadImage,
  onRemoveImage,
  onDownloadImage,
  onDelete,
}: SceneEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [form, setForm] = useState<SceneTextFields>(() => ({
    name: scene.name,
    description: scene.description,
    prompt: scene.prompt,
  }));
  const [dirty, setDirty] = useState(false);

  useDebouncedSave(form, (value) => onSaveFields(scene.id, value), 400, dirty);

  function update(field: keyof SceneTextFields, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  function openPicker() {
    if (!busy) fileRef.current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      await onUploadImage(scene, file);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemoveImage(scene);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownloadImage(scene);
    } finally {
      setDownloading(false);
    }
  }

  const hasImage = Boolean(scene.image_path);

  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-8 pt-5">
      {/* Image area: click to upload, or drag & drop */}
      <div
        role="button"
        tabIndex={0}
        aria-label={hasImage ? 'Replace image' : 'Upload image'}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed border-[#303039] bg-well outline-none focus-visible:border-accent"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={form.name || 'Scene image'}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDownload();
                }}
                disabled={downloading}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] px-[11px] text-[11.5px] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white disabled:opacity-60"
              >
                {downloading ? (
                  <Spinner size={13} className="animate-spin" />
                ) : (
                  <Download size={13} strokeWidth={1.8} />
                )}
                Download
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openPicker();
                }}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] px-[11px] text-[11.5px] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
              >
                <Upload size={13} strokeWidth={1.8} />
                Replace
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove();
                }}
                className="flex h-7 items-center rounded-lg border border-[#34343c] bg-[rgba(12,12,14,0.78)] px-[11px] text-[11.5px] text-[#d0d0d6] backdrop-blur transition-colors hover:text-white"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-[11px] text-[#62626c]">
            <Upload size={34} strokeWidth={1.5} />
            <div className="text-center leading-[1.5]">
              <div className="text-[13.5px] font-medium text-[#a6a6ae]">Click to upload</div>
              <div className="mt-0.5 text-[12px]">or drag &amp; drop an image</div>
            </div>
          </div>
        )}

        {/* Pending overlay while an upload/remove is in flight */}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,8,10,0.6)] text-accent">
            <Spinner size={26} className="animate-spin" />
          </div>
        )}
      </div>

      {/* Scene name */}
      <Field label="Scene name" className="mt-[22px]">
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Untitled scene"
          className="h-[42px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[15px] font-medium text-bright outline-none transition-colors focus:border-accent"
        />
      </Field>

      {/* Prompt */}
      <div className="mt-[18px]">
        <div className="mb-2 flex items-center gap-[7px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
            Prompt
          </span>
          <span className="text-[10.5px] text-[#52525a]">generation prompt</span>
        </div>
        <textarea
          value={form.prompt}
          onChange={(e) => update('prompt', e.target.value)}
          placeholder="Describe how this scene should be rendered…"
          className="min-h-[88px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
      </div>

      {/* Description */}
      <Field label="Description" className="mt-[18px]">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Notes, action, blocking, intent…"
          className="min-h-[80px] w-full resize-y rounded-[9px] border border-line-2 bg-field px-3.5 py-3 text-[13.5px] leading-[1.6] text-[#d6d6db] outline-none transition-colors focus:border-accent"
        />
      </Field>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Delete this scene? This cannot be undone.')) onDelete(scene);
        }}
        className="mt-6 flex h-[34px] items-center gap-[7px] rounded-lg border border-[#34242a] px-[13px] text-[12.5px] text-[#c96a6a] transition-colors hover:border-[#4a2a30] hover:bg-[#251618]"
      >
        <Trash size={13} />
        Delete scene
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
