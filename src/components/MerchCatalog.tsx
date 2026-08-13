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
} from '@/lib/scenes';
import { groupByStatus, moveItem, updateMerchFields } from '@/lib/merch';
import {
  addSceneMedia,
  fetchMediaForScenes,
  persistMediaOrder,
  removeSceneMediaItem,
} from '@/lib/media';
import { fetchProjects } from '@/lib/projects';
import type { MerchFields, MerchStatus, Project, Scene, SceneMedia } from '@/lib/types';
import { MerchBoard } from './MerchBoard';
import { MerchDetail } from './MerchDetail';
import { PipelineToolbar } from './PipelineToolbar';
import { ScriptPanel } from './ScriptPanel';

type MerchCatalogProps = {
  userId: string;
  project: Project;
};

/**
 * The merchandise tracking board. Mirrors PostPipeline: items are `scenes`
 * rows with their pictures in `scene_media`, so uploads, deletion sweeps and
 * the share page all reuse the existing machinery.
 */
export function MerchCatalog({ userId, project }: MerchCatalogProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Scene[] | null>(null); // null = loading
  const [mediaMap, setMediaMap] = useState<Record<string, SceneMedia[]> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notesOpen, setNotesOpen] = useLocalStorage('merch:notesOpen', false);

  // Load this project's items + media (re-runs if you switch projects).
  useEffect(() => {
    let active = true;
    setItems(null);
    setMediaMap(null);
    setDetailId(null);
    fetchScenes(supabase, project.id)
      .then(async (rows) => {
        if (!active) return;
        setItems(rows);
        const map = await fetchMediaForScenes(supabase, rows.map((r) => r.id));
        if (active) setMediaMap(map);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? 'Failed to load items.');
      });
    return () => {
      active = false;
    };
  }, [supabase, project.id]);

  // Load the project list for the switcher dropdown.
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

  // Live updates, so research Claude writes from the CLI lands without a reload.
  useEffect(() => {
    const channel = supabase
      .channel(`merch-items:${project.id}`)
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
  const columns = useMemo(() => groupByStatus(list), [list]);

  const mediaPaths = useMemo(
    () => Object.values(mediaMap ?? {}).flat().map((m) => m.path),
    [mediaMap],
  );
  const mediaUrls = useSignedUrls(supabase, mediaPaths);

  // --- mutations (optimistic local state + persistence) ---

  const handleAddItem = useCallback(async () => {
    try {
      // 'idea' rather than the column default 'draft', which is a social stage
      // and would leave the new row out of every merchandise column.
      const created = await createScene(supabase, userId, project.id, list.length, 'idea');
      setItems((prev) => [...(prev ?? []), created]);
      setMediaMap((prev) => ({ ...(prev ?? {}), [created.id]: [] }));
      setDetailId(created.id);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add item.');
    }
  }, [supabase, userId, project.id, list.length]);

  const handleSaveFields = useCallback(
    (id: string, fields: Partial<MerchFields>) => {
      setItems((prev) => prev?.map((p) => (p.id === id ? { ...p, ...fields } : p)) ?? prev);
      void updateMerchFields(supabase, id, fields).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save changes.'),
      );
    },
    [supabase],
  );

  /**
   * Drag a card to a stage. order_index is global across the project, so the
   * whole board is renumbered in reading order (column by column) and saved in
   * one upsert — that keeps the stored order authoritative and matches what
   * the board actually shows.
   */
  const handleMoveItem = useCallback(
    (itemId: string, toStatus: MerchStatus, toIndex: number) => {
      const current = items ?? [];
      const moving = current.find((i) => i.id === itemId);
      if (!moving) return;

      const flat = moveItem(current, itemId, toStatus, toIndex);
      if (flat === current) return;

      setItems(flat);

      if (moving.status !== toStatus) {
        void updateMerchFields(supabase, itemId, { status: toStatus }).catch((e) =>
          setError((e as Error)?.message ?? 'Failed to move item.'),
        );
      }
      void persistOrder(supabase, flat).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save order.'),
      );
    },
    [supabase, items],
  );

  const handleAddMedia = useCallback(
    async (item: Scene, files: File[]) => {
      setUploading(true);
      try {
        let position = mediaMap?.[item.id]?.length ?? 0;
        for (const file of files) {
          // Sequential so positions land in pick order; each success merges
          // immediately, so a later failure keeps what already uploaded.
          const created = await addSceneMedia(supabase, userId, item.id, file, position);
          position++;
          setMediaMap((prev) => ({
            ...(prev ?? {}),
            [item.id]: [...(prev?.[item.id] ?? []), created],
          }));
        }
      } catch (e) {
        setError((e as Error)?.message ?? 'Media upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [supabase, userId, mediaMap],
  );

  const handleRemoveMedia = useCallback(
    async (item: Scene, media: SceneMedia) => {
      setMediaMap((prev) => ({
        ...(prev ?? {}),
        [item.id]: (prev?.[item.id] ?? []).filter((m) => m.id !== media.id),
      }));
      try {
        await removeSceneMediaItem(supabase, media);
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to remove media.');
      }
    },
    [supabase],
  );

  const handleReorderMedia = useCallback(
    (item: Scene, ordered: SceneMedia[]) => {
      setMediaMap((prev) => ({
        ...(prev ?? {}),
        [item.id]: ordered.map((m, i) => ({ ...m, position: i })),
      }));
      void persistMediaOrder(supabase, ordered).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save media order.'),
      );
    },
    [supabase],
  );

  // Board reading order (column by column) drives prev/next in the detail panel.
  const visualOrder = useMemo(() => columns.flatMap((c) => c.items), [columns]);

  const handleDelete = useCallback(
    async (item: Scene) => {
      const idx = visualOrder.findIndex((p) => p.id === item.id);
      const remaining = visualOrder.filter((p) => p.id !== item.id);

      // Move/close the detail panel before the row disappears.
      if (remaining.length === 0) setDetailId(null);
      else if (detailId === item.id) {
        setDetailId(remaining[Math.min(idx, remaining.length - 1)]?.id ?? null);
      }

      setItems((prev) => prev?.filter((p) => p.id !== item.id) ?? prev);
      setMediaMap((prev) => {
        if (!prev) return prev;
        const { [item.id]: _gone, ...rest } = prev;
        return rest;
      });
      try {
        // deleteScene's folder sweep also removes this item's media objects;
        // scene_media rows cascade with the scenes row.
        await deleteSceneRow(supabase, item);
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to delete item.');
      }
    },
    [supabase, visualOrder, detailId],
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

  const currentItem = detailId ? list.find((p) => p.id === detailId) ?? null : null;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!detailId || visualOrder.length === 0) return;
      const idx = visualOrder.findIndex((p) => p.id === detailId);
      if (idx < 0) return;
      const next = (idx + dir + visualOrder.length) % visualOrder.length;
      setDetailId(visualOrder[next].id);
    },
    [detailId, visualOrder],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas font-sans text-ink">
      <PipelineToolbar
        supabase={supabase}
        userId={userId}
        project={project}
        projects={projects}
        postCount={list.length}
        cardSize={0}
        minSize={0}
        maxSize={0}
        onCardSize={() => {}}
        onAddPost={handleAddItem}
        notesOpen={notesOpen}
        onToggleNotes={toggleNotes}
        shareCopied={shareCopied}
        onCopyShareLink={copyShareLink}
        onSignOut={handleSignOut}
        noun={{ one: 'item', many: 'items' }}
        addLabel="Add item"
        showCardSize={false}
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
            Loading items…
          </div>
        ) : (
          <MerchBoard
            columns={columns}
            itemCount={list.length}
            mediaMap={mediaMap}
            mediaUrls={mediaUrls}
            onOpenItem={setDetailId}
            onAddItem={handleAddItem}
            onMoveItem={handleMoveItem}
          />
        )}
        {notesOpen && (
          <ScriptPanel
            supabase={supabase}
            userId={userId}
            projectId={project.id}
            onClose={toggleNotes}
            title="Notes"
            placeholder={
              'Line planning, margins, vendors to try…\n\ne.g. target 60% margin; avoid MOQs over 250 units.'
            }
          />
        )}
      </div>

      {currentItem && (
        <MerchDetail
          item={currentItem}
          media={mediaMap?.[currentItem.id] ?? []}
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
