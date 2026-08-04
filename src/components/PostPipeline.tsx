'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { createClient } from '@/lib/supabase/client';
import { createScene, deleteScene as deleteSceneRow, fetchScenes, persistOrder } from '@/lib/scenes';
import { updatePostFields } from '@/lib/posts';
import {
  addSceneMedia,
  fetchMediaForScenes,
  persistMediaOrder,
  removeSceneMediaItem,
} from '@/lib/media';
import { fetchProjects } from '@/lib/projects';
import { splitPipeline } from '@/lib/pipeline';
import type { PostFields, Project, Scene, SceneMedia } from '@/lib/types';
import { PipelineBoard } from './PipelineBoard';
import { PipelineToolbar } from './PipelineToolbar';
import { PostDetail } from './PostDetail';
import { ScriptPanel } from './ScriptPanel';

const MIN_SIZE = 180;
const MAX_SIZE = 420;
const DEFAULT_SIZE = 268;

type PostPipelineProps = {
  userId: string;
  project: Project;
};

export function PostPipeline({ userId, project }: PostPipelineProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [posts, setPosts] = useState<Scene[] | null>(null); // null = loading
  const [mediaMap, setMediaMap] = useState<Record<string, SceneMedia[]> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cardSize, setCardSize] = useLocalStorage('pipeline:cardSize', DEFAULT_SIZE);
  const [notesOpen, setNotesOpen] = useLocalStorage('pipeline:notesOpen', false);

  // Load this project's posts + media (re-runs if you switch projects).
  useEffect(() => {
    let active = true;
    setPosts(null);
    setMediaMap(null);
    setDetailId(null);
    fetchScenes(supabase, project.id)
      .then(async (rows) => {
        if (!active) return;
        setPosts(rows);
        const map = await fetchMediaForScenes(supabase, rows.map((r) => r.id));
        if (active) setMediaMap(map);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? 'Failed to load posts.');
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

  const list = useMemo(() => posts ?? [], [posts]);
  const { backlog, groups } = useMemo(() => splitPipeline(list), [list]);

  const mediaPaths = useMemo(
    () => Object.values(mediaMap ?? {}).flat().map((m) => m.path),
    [mediaMap],
  );
  const mediaUrls = useSignedUrls(supabase, mediaPaths);

  // --- mutations (optimistic local state + persistence) ---

  const handleAddPost = useCallback(async () => {
    try {
      const created = await createScene(supabase, userId, project.id, backlog.length);
      setPosts((prev) => [...(prev ?? []), created]);
      setMediaMap((prev) => ({ ...(prev ?? {}), [created.id]: [] }));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add post.');
    }
  }, [supabase, userId, project.id, backlog.length]);

  const handleReorderBacklog = useCallback(
    (ordered: Scene[]) => {
      const renumbered = new Map(ordered.map((p, i) => [p.id, i]));
      setPosts(
        (prev) =>
          prev?.map((p) => (renumbered.has(p.id) ? { ...p, order_index: renumbered.get(p.id)! } : p)) ??
          prev,
      );
      void persistOrder(supabase, ordered).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save order.'),
      );
    },
    [supabase],
  );

  const handleSaveFields = useCallback(
    (id: string, fields: Partial<PostFields>) => {
      setPosts((prev) => prev?.map((p) => (p.id === id ? { ...p, ...fields } : p)) ?? prev);
      void updatePostFields(supabase, id, fields).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save changes.'),
      );
    },
    [supabase],
  );

  const handleAddMedia = useCallback(
    async (post: Scene, files: File[]) => {
      setUploading(true);
      try {
        let position = mediaMap?.[post.id]?.length ?? 0;
        for (const file of files) {
          // Sequential so positions land in pick order; each success merges
          // immediately, so a later failure keeps what already uploaded.
          const created = await addSceneMedia(supabase, userId, post.id, file, position);
          position++;
          setMediaMap((prev) => ({
            ...(prev ?? {}),
            [post.id]: [...(prev?.[post.id] ?? []), created],
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
    async (post: Scene, media: SceneMedia) => {
      setMediaMap((prev) => ({
        ...(prev ?? {}),
        [post.id]: (prev?.[post.id] ?? []).filter((m) => m.id !== media.id),
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
    (post: Scene, ordered: SceneMedia[]) => {
      setMediaMap((prev) => ({
        ...(prev ?? {}),
        [post.id]: ordered.map((m, i) => ({ ...m, position: i })),
      }));
      void persistMediaOrder(supabase, ordered).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save media order.'),
      );
    },
    [supabase],
  );

  // Visual order (backlog, then schedule) drives prev/next in the detail panel.
  const visualOrder = useMemo(
    () => [...backlog, ...groups.flatMap((g) => g.posts)],
    [backlog, groups],
  );

  const handleDelete = useCallback(
    async (post: Scene) => {
      const idx = visualOrder.findIndex((p) => p.id === post.id);
      const remainingVisual = visualOrder.filter((p) => p.id !== post.id);

      // Move/close the detail panel before the row disappears.
      if (remainingVisual.length === 0) setDetailId(null);
      else if (detailId === post.id) {
        setDetailId(remainingVisual[Math.min(idx, remainingVisual.length - 1)]?.id ?? null);
      }

      const remainingBacklog = backlog.filter((p) => p.id !== post.id).map((p, i) => ({ ...p, order_index: i }));
      setPosts((prev) => prev?.filter((p) => p.id !== post.id) ?? prev);
      setMediaMap((prev) => {
        if (!prev) return prev;
        const { [post.id]: _gone, ...rest } = prev;
        return rest;
      });
      try {
        // deleteScene's folder sweep also removes this post's media objects;
        // scene_media rows cascade with the scenes row.
        await deleteSceneRow(supabase, post);
        await persistOrder(supabase, remainingBacklog);
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to delete post.');
      }
    },
    [supabase, visualOrder, backlog, detailId],
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

  // --- detail navigation ---
  const currentPost = detailId ? list.find((p) => p.id === detailId) ?? null : null;

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
        cardSize={cardSize}
        minSize={MIN_SIZE}
        maxSize={MAX_SIZE}
        onCardSize={setCardSize}
        onAddPost={handleAddPost}
        notesOpen={notesOpen}
        onToggleNotes={toggleNotes}
        shareCopied={shareCopied}
        onCopyShareLink={copyShareLink}
        onSignOut={handleSignOut}
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
        {posts === null ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
            Loading posts…
          </div>
        ) : (
          <PipelineBoard
            backlog={backlog}
            groups={groups}
            cardSize={cardSize}
            mediaMap={mediaMap}
            mediaUrls={mediaUrls}
            onOpenPost={setDetailId}
            onAddPost={handleAddPost}
            onReorderBacklog={handleReorderBacklog}
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
              'Posting criteria, cadence, content pillars…\n\ne.g. 3 posts/week — Mon teaser, Wed build log, Fri result.'
            }
          />
        )}
      </div>

      {currentPost && (
        <PostDetail
          post={currentPost}
          media={mediaMap?.[currentPost.id] ?? []}
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
