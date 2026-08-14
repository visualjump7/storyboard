'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { createClient } from '@/lib/supabase/client';
import {
  createScene,
  deleteScene as deleteSceneRow,
  fetchScenes,
  persistOrder,
  updateSceneFields,
} from '@/lib/scenes';
import {
  addSceneMedia,
  fetchMediaForScenes,
  persistMediaOrder,
  removeSceneMediaItem,
} from '@/lib/media';
import { fetchProjects } from '@/lib/projects';
import {
  SHOWCASE_META,
  type Project,
  type Scene,
  type SceneMedia,
  type ShowcaseFields,
  type ShowcaseKind,
} from '@/lib/types';
import { PipelineToolbar } from './PipelineToolbar';
import { ScriptPanel } from './ScriptPanel';
import { ShowcaseCard } from './ShowcaseCard';
import { ShowcaseDetail } from './ShowcaseDetail';
import { Plus } from './icons';

const CARD_CHROME =
  'group relative cursor-pointer select-none overflow-hidden rounded-xl border border-line bg-card text-left shadow-card transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#3a3a44] hover:shadow-card-hover';

type ShowcaseCatalogProps = {
  kind: ShowcaseKind;
  userId: string;
  project: Project;
};

/**
 * Shared surface for the game and music kinds: a grid of items, each with
 * media (screenshots / a short video / audio), a summary, a link out, and a
 * stage. Items are `scenes` rows with their media in `scene_media`, so uploads,
 * the deletion sweep, share links and realtime all reuse existing machinery.
 */
export function ShowcaseCatalog({ kind, userId, project }: ShowcaseCatalogProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const meta = SHOWCASE_META[kind];

  const [items, setItems] = useState<Scene[] | null>(null); // null = loading
  const [mediaMap, setMediaMap] = useState<Record<string, SceneMedia[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cardSize, setCardSize] = useLocalStorage('showcase:cardSize', 300);
  const [notesOpen, setNotesOpen] = useLocalStorage('showcase:notesOpen', false);

  useEffect(() => {
    let active = true;
    setItems(null);
    setDetailId(null);
    fetchScenes(supabase, project.id)
      .then(async (rows) => {
        if (!active) return;
        setItems(rows);
        const media = await fetchMediaForScenes(supabase, rows.map((r) => r.id));
        if (active) setMediaMap(media);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? `Failed to load ${meta.noun.many}.`);
      });
    return () => {
      active = false;
    };
  }, [supabase, project.id, meta.noun.many]);

  useEffect(() => {
    let active = true;
    fetchProjects(supabase)
      .then((p) => {
        if (active) setProjects(p);
      })
      .catch(() => {
        // Non-fatal: the switcher falls back to just the current project.
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  // Live updates, so items written from the CLI land without a reload.
  useEffect(() => {
    const channel = supabase
      .channel(`showcase:${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scenes', filter: `project_id=eq.${project.id}` },
        (payload) => {
          setItems((prev) => {
            if (prev === null) return prev;
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as { id?: string }).id;
              return prev.filter((s) => s.id !== oldId);
            }
            const row = payload.new as Scene;
            const merged = prev.some((s) => s.id === row.id)
              ? prev.map((s) => (s.id === row.id ? { ...s, ...row } : s))
              : [...prev, row];
            return merged.slice().sort((a, b) => a.order_index - b.order_index);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, project.id]);

  const list = useMemo(() => items ?? [], [items]);
  const mediaPaths = useMemo(
    () => Object.values(mediaMap).flat().map((m) => m.path),
    [mediaMap],
  );
  const mediaUrls = useSignedUrls(supabase, mediaPaths);

  const fail = useCallback((e: unknown, fallback: string) => {
    setError((e as Error)?.message ?? fallback);
  }, []);

  const handleAdd = useCallback(async () => {
    try {
      // The kind's first stage, not the column default 'draft' (a social stage).
      const created = await createScene(
        supabase,
        userId,
        project.id,
        list.length,
        meta.statuses[0],
      );
      setItems((prev) => [...(prev ?? []), created]);
      setMediaMap((prev) => ({ ...prev, [created.id]: [] }));
      setDetailId(created.id);
    } catch (e) {
      fail(e, `Failed to add ${meta.noun.one}.`);
    }
  }, [supabase, userId, project.id, list.length, meta, fail]);

  const handleSaveFields = useCallback(
    (id: string, fields: Partial<ShowcaseFields>) => {
      setItems((prev) => prev?.map((p) => (p.id === id ? { ...p, ...fields } : p)) ?? prev);
      // updateSceneFields writes arbitrary scene columns with the manual
      // updated_at; showcase fields are a subset of them.
      void updateSceneFields(supabase, id, fields as never).catch((e) =>
        fail(e, 'Failed to save changes.'),
      );
    },
    [supabase, fail],
  );

  const handleAddMedia = useCallback(
    async (item: Scene, files: File[]) => {
      setUploading(true);
      try {
        let position = mediaMap[item.id]?.length ?? 0;
        for (const file of files) {
          const created = await addSceneMedia(supabase, userId, item.id, file, position);
          position++;
          setMediaMap((prev) => ({
            ...prev,
            [item.id]: [...(prev[item.id] ?? []), created],
          }));
        }
      } catch (e) {
        fail(e, 'Media upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [supabase, userId, mediaMap, fail],
  );

  const handleRemoveMedia = useCallback(
    async (item: Scene, media: SceneMedia) => {
      setMediaMap((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? []).filter((m) => m.id !== media.id),
      }));
      try {
        await removeSceneMediaItem(supabase, media);
      } catch (e) {
        fail(e, 'Failed to remove media.');
      }
    },
    [supabase, fail],
  );

  const handleReorderMedia = useCallback(
    (item: Scene, ordered: SceneMedia[]) => {
      setMediaMap((prev) => ({
        ...prev,
        [item.id]: ordered.map((m, i) => ({ ...m, position: i })),
      }));
      void persistMediaOrder(supabase, ordered).catch((e) =>
        fail(e, 'Failed to save media order.'),
      );
    },
    [supabase, fail],
  );

  const handleDelete = useCallback(
    async (item: Scene) => {
      const idx = list.findIndex((p) => p.id === item.id);
      const remaining = list.filter((p) => p.id !== item.id);
      if (remaining.length === 0) setDetailId(null);
      else if (detailId === item.id) {
        setDetailId(remaining[Math.min(idx, remaining.length - 1)]?.id ?? null);
      }
      setItems((prev) => prev?.filter((p) => p.id !== item.id) ?? prev);
      setMediaMap((prev) => {
        const { [item.id]: _gone, ...rest } = prev;
        return rest;
      });
      try {
        await deleteSceneRow(supabase, item);
        await persistOrder(
          supabase,
          remaining.map((p, i) => ({ ...p, order_index: i })),
        );
      } catch (e) {
        fail(e, `Failed to delete ${meta.noun.one}.`);
      }
    },
    [supabase, list, detailId, meta.noun.one, fail],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }, [supabase, router]);

  const toggleNotes = useCallback(() => setNotesOpen(!notesOpen), [notesOpen, setNotesOpen]);

  const copyShareLink = useCallback(() => {
    const url = `${window.location.origin}/share/${project.share_token}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setShareCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setShareCopied(false), 2000);
      })
      .catch(() => setError(`Couldn’t copy — share link: ${url}`));
  }, [project.share_token]);

  const current = detailId ? list.find((p) => p.id === detailId) ?? null : null;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!detailId || list.length === 0) return;
      const idx = list.findIndex((p) => p.id === detailId);
      if (idx < 0) return;
      setDetailId(list[(idx + dir + list.length) % list.length].id);
    },
    [detailId, list],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas font-sans text-ink">
      <PipelineToolbar
        supabase={supabase}
        userId={userId}
        project={project}
        projects={projects}
        postCount={list.length}
        cardSize={cardSize}
        minSize={220}
        maxSize={460}
        onCardSize={setCardSize}
        onAddPost={handleAdd}
        notesOpen={notesOpen}
        onToggleNotes={toggleNotes}
        shareCopied={shareCopied}
        onCopyShareLink={copyShareLink}
        onSignOut={handleSignOut}
        noun={meta.noun}
        addLabel={`Add ${meta.noun.one}`}
      />

      {error && (
        <div className="flex-none border-b border-[#4a2a30] bg-[#251618] px-[22px] py-2 text-[12.5px] text-[#e0a0a0]">
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

      <div className="flex min-h-0 flex-1">
        {items === null ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
            Loading {meta.noun.many}…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-[15px] font-semibold text-bright">No {meta.noun.many} yet</div>
            <p className="max-w-xs text-[13px] leading-relaxed text-muted">
              {kind === 'game'
                ? 'Add a game — screenshots, a short video, a summary, and a link to play it.'
                : 'Add a track — cover art, the audio, a summary, and a link to listen.'}
            </p>
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-[34px] items-center gap-[7px] rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <Plus size={14} />
              Add your first {meta.noun.one}
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-y-auto px-[26px] pb-20 pt-7">
            <div className="flex flex-wrap content-start gap-[22px]">
              {list.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  style={{ width: cardSize }}
                  onClick={() => setDetailId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDetailId(item.id);
                    }
                  }}
                  className={CARD_CHROME}
                >
                  <ShowcaseCard
                    kind={kind}
                    item={item}
                    media={mediaMap[item.id]}
                    mediaUrls={mediaUrls}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {notesOpen && (
          <ScriptPanel
            supabase={supabase}
            userId={userId}
            projectId={project.id}
            onClose={toggleNotes}
            title="Notes"
            placeholder={
              kind === 'game'
                ? 'Build notes, playtest feedback, store copy…'
                : 'Release plan, distributor, metadata, credits…'
            }
          />
        )}
      </div>

      {current && (
        <ShowcaseDetail
          kind={kind}
          item={current}
          media={mediaMap[current.id] ?? []}
          mediaUrls={mediaUrls}
          uploading={uploading}
          onClose={() => setDetailId(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onSaveFields={handleSaveFields}
          onAddMedia={handleAddMedia}
          onRemoveMedia={handleRemoveMedia}
          onReorderMedia={handleReorderMedia}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
