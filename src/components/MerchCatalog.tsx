'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { createClient } from '@/lib/supabase/client';
import { createScene, deleteScene as deleteSceneRow, fetchScenes } from '@/lib/scenes';
import { updateMerchFields } from '@/lib/merch';
import {
  addOrder,
  addQuote,
  fetchOrdersForScenes,
  fetchQuotesForScenes,
  removeOrder,
  removeQuote,
  updateOrder,
  updateQuote,
} from '@/lib/merchLines';
import {
  addSceneMedia,
  fetchMediaForScenes,
  persistMediaOrder,
  removeSceneMediaItem,
} from '@/lib/media';
import { fetchProjects } from '@/lib/projects';
import type {
  MerchFields,
  MerchOrder,
  MerchOrderFields,
  MerchQuote,
  MerchQuoteFields,
  Project,
  Scene,
  SceneMedia,
} from '@/lib/types';
import { MerchRow } from './MerchRow';
import { PipelineToolbar } from './PipelineToolbar';
import { Plus } from './icons';
import { ScriptPanel } from './ScriptPanel';

type MerchCatalogProps = {
  userId: string;
  project: Project;
};

/**
 * The merchandise tracking list. One expandable row per product; its
 * suppliers/quotes and orders are child rows in merch_quotes / merch_orders.
 * Products themselves are `scenes` rows with pictures in `scene_media`, so
 * uploads, the deletion sweep and share links reuse existing machinery.
 */
export function MerchCatalog({ userId, project }: MerchCatalogProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Scene[] | null>(null); // null = loading
  const [mediaMap, setMediaMap] = useState<Record<string, SceneMedia[]>>({});
  const [quoteMap, setQuoteMap] = useState<Record<string, MerchQuote[]>>({});
  const [orderMap, setOrderMap] = useState<Record<string, MerchOrder[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notesOpen, setNotesOpen] = useLocalStorage('merch:notesOpen', false);

  // Load this project's products with their media, quotes and orders.
  useEffect(() => {
    let active = true;
    setItems(null);
    setExpandedId(null);
    fetchScenes(supabase, project.id)
      .then(async (rows) => {
        if (!active) return;
        setItems(rows);
        const ids = rows.map((r) => r.id);
        const [media, quotes, orders] = await Promise.all([
          fetchMediaForScenes(supabase, ids),
          fetchQuotesForScenes(supabase, ids),
          fetchOrdersForScenes(supabase, ids),
        ]);
        if (!active) return;
        setMediaMap(media);
        setQuoteMap(quotes);
        setOrderMap(orders);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? 'Failed to load products.');
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

  // Live updates, so research written from the CLI lands without a reload.
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

  const mediaPaths = useMemo(
    () => Object.values(mediaMap).flat().map((m) => m.path),
    [mediaMap],
  );
  const mediaUrls = useSignedUrls(supabase, mediaPaths);

  const fail = useCallback((e: unknown, fallback: string) => {
    setError((e as Error)?.message ?? fallback);
  }, []);

  // --- products ---

  const handleAddItem = useCallback(async () => {
    try {
      // 'concept' rather than the column default 'draft', which is a social
      // stage and would leave the new row showing the wrong badge.
      const created = await createScene(supabase, userId, project.id, list.length, 'concept');
      setItems((prev) => [...(prev ?? []), created]);
      setMediaMap((prev) => ({ ...prev, [created.id]: [] }));
      setQuoteMap((prev) => ({ ...prev, [created.id]: [] }));
      setOrderMap((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedId(created.id);
    } catch (e) {
      fail(e, 'Failed to add product.');
    }
  }, [supabase, userId, project.id, list.length, fail]);

  const handleSaveFields = useCallback(
    (id: string, fields: Partial<MerchFields>) => {
      setItems((prev) => prev?.map((p) => (p.id === id ? { ...p, ...fields } : p)) ?? prev);
      void updateMerchFields(supabase, id, fields).catch((e) => fail(e, 'Failed to save changes.'));
    },
    [supabase, fail],
  );

  const handleDelete = useCallback(
    async (item: Scene) => {
      if (
        !window.confirm(
          `Delete "${item.name || 'this product'}"? Its images, quotes, and orders go with it.`,
        )
      )
        return;
      if (expandedId === item.id) setExpandedId(null);
      setItems((prev) => prev?.filter((p) => p.id !== item.id) ?? prev);
      try {
        // The folder sweep clears its images; quotes, orders and scene_media
        // rows cascade with the scenes row.
        await deleteSceneRow(supabase, item);
      } catch (e) {
        fail(e, 'Failed to delete product.');
      }
    },
    [supabase, expandedId, fail],
  );

  // --- media ---

  const handleAddMedia = useCallback(
    async (item: Scene, files: File[]) => {
      setUploading(true);
      try {
        let position = mediaMap[item.id]?.length ?? 0;
        for (const file of files) {
          // Sequential so positions land in pick order; each success merges
          // immediately, so a later failure keeps what already uploaded.
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

  // --- quotes ---

  const handleAddQuote = useCallback(
    async (item: Scene) => {
      try {
        const created = await addQuote(
          supabase,
          userId,
          item.id,
          quoteMap[item.id]?.length ?? 0,
        );
        setQuoteMap((prev) => ({ ...prev, [item.id]: [...(prev[item.id] ?? []), created] }));
      } catch (e) {
        fail(e, 'Failed to add supplier.');
      }
    },
    [supabase, userId, quoteMap, fail],
  );

  const handleSaveQuote = useCallback(
    (id: string, fields: Partial<MerchQuoteFields>) => {
      setQuoteMap((prev) => {
        const next: Record<string, MerchQuote[]> = {};
        for (const [sceneId, rows] of Object.entries(prev)) {
          next[sceneId] = rows.map((q) => (q.id === id ? { ...q, ...fields } : q));
        }
        return next;
      });
      void updateQuote(supabase, id, fields).catch((e) => fail(e, 'Failed to save supplier.'));
    },
    [supabase, fail],
  );

  const handleRemoveQuote = useCallback(
    async (quote: MerchQuote) => {
      setQuoteMap((prev) => ({
        ...prev,
        [quote.scene_id]: (prev[quote.scene_id] ?? []).filter((q) => q.id !== quote.id),
      }));
      try {
        await removeQuote(supabase, quote.id);
      } catch (e) {
        fail(e, 'Failed to remove supplier.');
      }
    },
    [supabase, fail],
  );

  // --- orders ---

  const handleAddOrder = useCallback(
    async (item: Scene) => {
      try {
        const created = await addOrder(
          supabase,
          userId,
          item.id,
          orderMap[item.id]?.length ?? 0,
        );
        setOrderMap((prev) => ({ ...prev, [item.id]: [...(prev[item.id] ?? []), created] }));
      } catch (e) {
        fail(e, 'Failed to add order.');
      }
    },
    [supabase, userId, orderMap, fail],
  );

  const handleSaveOrder = useCallback(
    (id: string, fields: Partial<MerchOrderFields>) => {
      setOrderMap((prev) => {
        const next: Record<string, MerchOrder[]> = {};
        for (const [sceneId, rows] of Object.entries(prev)) {
          next[sceneId] = rows.map((o) => (o.id === id ? { ...o, ...fields } : o));
        }
        return next;
      });
      void updateOrder(supabase, id, fields).catch((e) => fail(e, 'Failed to save order.'));
    },
    [supabase, fail],
  );

  const handleRemoveOrder = useCallback(
    async (order: MerchOrder) => {
      setOrderMap((prev) => ({
        ...prev,
        [order.scene_id]: (prev[order.scene_id] ?? []).filter((o) => o.id !== order.id),
      }));
      try {
        await removeOrder(supabase, order.id);
      } catch (e) {
        fail(e, 'Failed to remove order.');
      }
    },
    [supabase, fail],
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
        noun={{ one: 'product', many: 'products' }}
        addLabel="Add product"
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
            Loading products…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-[15px] font-semibold text-bright">No products yet</div>
            <p className="max-w-xs text-[13px] leading-relaxed text-muted">
              Add a product and drop in a picture — suppliers, quotes, and orders go inside it.
            </p>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex h-[34px] items-center gap-[7px] rounded-lg border border-accent bg-accent px-3.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <Plus size={14} />
              Add your first product
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-y-auto px-[26px] pb-20 pt-7">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-2.5">
              {list.map((item) => (
                <MerchRow
                  key={item.id}
                  item={item}
                  media={mediaMap[item.id] ?? []}
                  mediaUrls={mediaUrls}
                  quotes={quoteMap[item.id] ?? []}
                  orders={orderMap[item.id] ?? []}
                  expanded={expandedId === item.id}
                  uploading={uploading}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onSaveFields={handleSaveFields}
                  onDelete={handleDelete}
                  onAddMedia={handleAddMedia}
                  onRemoveMedia={handleRemoveMedia}
                  onReorderMedia={handleReorderMedia}
                  onAddQuote={handleAddQuote}
                  onSaveQuote={handleSaveQuote}
                  onRemoveQuote={handleRemoveQuote}
                  onAddOrder={handleAddOrder}
                  onSaveOrder={handleSaveOrder}
                  onRemoveOrder={handleRemoveOrder}
                />
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
              'Line planning, margins, vendors to try…\n\ne.g. target 60% margin; avoid MOQs over 250 units.'
            }
          />
        )}
      </div>
    </div>
  );
}
