'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * In-app replacements for window.prompt / window.confirm.
 *
 * The native dialogs are missing in some embedded browsers — an Electron-based
 * preview pane throws "prompt() is not supported" — which made Rename, New
 * workspace, and the delete confirmations silently do nothing there. They also
 * can't be styled. Usage:
 *
 *   const dialogs = useDialog();
 *   const name = await dialogs.prompt({ title: 'Rename project', initial: p.name });
 *   if (await dialogs.confirm({ title: 'Delete?', danger: true })) …
 *   return <div>{dialogs.dialog} …</div>;
 *
 * The dialog portals to <body>, so a transformed or overflow-clipped ancestor
 * (a slide-over) can't clip it, and it stops event propagation at its root so
 * clicks and keys inside it never reach the React ancestors that render it.
 */

type PromptRequest = {
  kind: 'prompt';
  title: string;
  initial: string;
  placeholder?: string;
  confirmLabel: string;
  resolve: (value: string | null) => void;
};

type ConfirmRequest = {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

type DialogRequest = PromptRequest | ConfirmRequest;

/** Resolve a request as cancelled (prompt -> null, confirm -> false). */
function cancelRequest(r: DialogRequest | null) {
  if (!r) return;
  if (r.kind === 'prompt') r.resolve(null);
  else r.resolve(false);
}

export function useDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  // Mirrors `request` synchronously so a second call, or an unmount, can
  // settle the open request without waiting for a render.
  const current = useRef<DialogRequest | null>(null);

  const open = useCallback((next: DialogRequest) => {
    cancelRequest(current.current);
    current.current = next;
    setRequest(next);
  }, []);

  const finish = useCallback((r: DialogRequest, value: string | null | boolean) => {
    if (current.current !== r) return; // already settled or replaced
    current.current = null;
    setRequest(null);
    if (r.kind === 'prompt') r.resolve(typeof value === 'string' ? value : null);
    else r.resolve(value === true);
  }, []);

  // Never leave a caller awaiting forever if the owner unmounts mid-dialog.
  useEffect(
    () => () => {
      cancelRequest(current.current);
      current.current = null;
    },
    [],
  );

  const prompt = useCallback(
    (opts: { title: string; initial?: string; placeholder?: string; confirmLabel?: string }) =>
      new Promise<string | null>((resolve) =>
        open({
          kind: 'prompt',
          title: opts.title,
          initial: opts.initial ?? '',
          placeholder: opts.placeholder,
          confirmLabel: opts.confirmLabel ?? 'Save',
          resolve,
        }),
      ),
    [open],
  );

  const confirm = useCallback(
    (opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) =>
        open({
          kind: 'confirm',
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'OK',
          danger: opts.danger ?? false,
          resolve,
        }),
      ),
    [open],
  );

  const dialog = request ? <DialogView request={request} onFinish={finish} /> : null;
  return { dialog, prompt, confirm };
}

function DialogView({
  request,
  onFinish,
}: {
  request: DialogRequest;
  onFinish: (r: DialogRequest, value: string | null | boolean) => void;
}) {
  const titleId = useId();
  const [value, setValue] = useState(request.kind === 'prompt' ? request.initial : '');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const danger = request.kind === 'confirm' && request.danger;
  const cancel = useCallback(
    () => onFinish(request, request.kind === 'prompt' ? null : false),
    [onFinish, request],
  );

  // Portals need document; render nothing during SSR / before mount.
  useEffect(() => setMounted(true), []);

  // Focus: the text field for a prompt (selected, so typing replaces it);
  // Cancel for a destructive confirm, so Enter never deletes by accident.
  useEffect(() => {
    if (!mounted) return;
    if (request.kind === 'prompt') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (danger) {
      cancelRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [mounted, request, danger]);

  // Capture-phase Escape so it closes only this dialog, not a slide-over or
  // lightbox behind it (their listeners run in the bubble phase).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cancel]);

  if (!mounted) return null;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      <div
        aria-hidden="true"
        onClick={cancel}
        className="absolute inset-0 bg-[rgba(4,4,6,0.72)] backdrop-blur-[2px]"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFinish(request, request.kind === 'prompt' ? value : true);
        }}
        className="relative w-full max-w-[420px] rounded-xl border border-line bg-card p-5 shadow-slideover"
      >
        <h2 id={titleId} className="text-[14.5px] font-semibold tracking-[-0.01em] text-bright">
          {request.title}
        </h2>
        {request.kind === 'confirm' && request.message && (
          <p className="mt-2 text-[13px] leading-[1.55] text-[#b4b4be]">{request.message}</p>
        )}
        {request.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={request.placeholder}
            aria-label={request.title}
            className="mt-3 h-[38px] w-full rounded-[9px] border border-line-2 bg-field px-3.5 text-[13.5px] text-[#d6d6db] outline-none transition-colors focus:border-accent"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            className="h-[34px] rounded-lg border border-line-2 px-3.5 text-[12.5px] text-[#c4c4cc] transition-colors hover:bg-[#26262e] hover:text-white"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={
              danger
                ? 'h-[34px] rounded-lg border border-[#4a2a30] bg-[#251618] px-3.5 text-[12.5px] font-medium text-[#e0a0a0] transition-colors hover:border-[#6a3038] hover:bg-[#301a1d] hover:text-white'
                : 'h-[34px] rounded-lg bg-accent px-3.5 text-[12.5px] font-semibold text-canvas transition-opacity hover:opacity-90'
            }
          >
            {request.confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
