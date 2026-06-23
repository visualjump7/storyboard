'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSceneImageUrls } from '@/hooks/useSceneImageUrls';
import { createClient } from '@/lib/supabase/client';
import {
  createScene,
  deleteScene as deleteSceneRow,
  fetchScenes,
  persistOrder,
  removeSceneImage,
  setSceneImage,
  updateSceneFields,
} from '@/lib/scenes';
import { fetchProjects } from '@/lib/projects';
import { signImageDownloadUrl } from '@/lib/storage';
import type { Project, Scene, SceneTextFields } from '@/lib/types';
import { Grid } from './Grid';
import { SceneDetail } from './SceneDetail';
import { ScriptPanel } from './ScriptPanel';
import { Toolbar } from './Toolbar';

const MIN_SIZE = 180;
const MAX_SIZE = 420;
const DEFAULT_SIZE = 268;

type StoryboardProps = {
  userId: string;
  project: Project;
};

export function Storyboard({ userId, project }: StoryboardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [scenes, setScenes] = useState<Scene[] | null>(null); // null = loading
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [cardSize, setCardSize] = useLocalStorage('storyboard:cardSize', DEFAULT_SIZE);
  const [scriptOpen, setScriptOpen] = useLocalStorage('storyboard:scriptOpen', false);

  // Load this project's scenes (re-runs if you switch to another project).
  useEffect(() => {
    let active = true;
    setScenes(null);
    setDetailId(null);
    fetchScenes(supabase, project.id)
      .then((rows) => {
        if (active) setScenes(rows);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? 'Failed to load scenes.');
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

  const list = useMemo(() => scenes ?? [], [scenes]);
  const imageUrls = useSceneImageUrls(supabase, list);

  // --- mutations (optimistic local state + persistence) ---

  const handleAddScene = useCallback(async () => {
    try {
      const created = await createScene(supabase, userId, project.id, list.length);
      setScenes((prev) => [...(prev ?? []), created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add scene.');
    }
  }, [supabase, userId, project.id, list.length]);

  const handleReorder = useCallback(
    (ordered: Scene[]) => {
      const renumbered = ordered.map((s, i) => ({ ...s, order_index: i }));
      setScenes(renumbered);
      void persistOrder(supabase, ordered).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save order.'),
      );
    },
    [supabase],
  );

  const handleSaveFields = useCallback(
    (id: string, fields: SceneTextFields) => {
      setScenes((prev) => prev?.map((s) => (s.id === id ? { ...s, ...fields } : s)) ?? prev);
      void updateSceneFields(supabase, id, fields).catch((e) =>
        setError((e as Error)?.message ?? 'Failed to save changes.'),
      );
    },
    [supabase],
  );

  const handleUploadImage = useCallback(
    async (scene: Scene, file: File) => {
      try {
        const newPath = await setSceneImage(supabase, scene, file);
        setScenes((prev) =>
          prev?.map((s) => (s.id === scene.id ? { ...s, image_path: newPath } : s)) ?? prev,
        );
      } catch (e) {
        setError((e as Error)?.message ?? 'Image upload failed.');
      }
    },
    [supabase],
  );

  const handleRemoveImage = useCallback(
    async (scene: Scene) => {
      try {
        await removeSceneImage(supabase, scene);
        setScenes((prev) =>
          prev?.map((s) => (s.id === scene.id ? { ...s, image_path: null } : s)) ?? prev,
        );
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to remove image.');
      }
    },
    [supabase],
  );

  const handleDownloadImage = useCallback(
    async (scene: Scene) => {
      if (!scene.image_path) return;
      try {
        const ext = scene.image_path.split('.').pop() || 'png';
        const slug =
          (scene.name || 'scene')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'scene';
        const url = await signImageDownloadUrl(supabase, scene.image_path, `${slug}.${ext}`);
        // Anchor click with an attachment Content-Disposition downloads without
        // navigating the page away.
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to download image.');
      }
    },
    [supabase],
  );

  const handleDelete = useCallback(
    async (scene: Scene) => {
      const idx = list.findIndex((s) => s.id === scene.id);
      const remaining = list.filter((s) => s.id !== scene.id).map((s, i) => ({ ...s, order_index: i }));

      // Move/close the detail panel before the row disappears.
      if (remaining.length === 0) setDetailId(null);
      else if (detailId === scene.id) {
        setDetailId(remaining[Math.min(idx, remaining.length - 1)]?.id ?? null);
      }

      setScenes(remaining);
      try {
        await deleteSceneRow(supabase, scene);
        await persistOrder(supabase, remaining);
      } catch (e) {
        setError((e as Error)?.message ?? 'Failed to delete scene.');
      }
    },
    [supabase, list, detailId],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }, [supabase, router]);

  const toggleScript = useCallback(
    () => setScriptOpen(!scriptOpen),
    [scriptOpen, setScriptOpen],
  );

  // --- detail navigation ---
  const detailIndex = detailId ? list.findIndex((s) => s.id === detailId) : -1;
  const currentScene = detailIndex >= 0 ? list[detailIndex] : null;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (detailIndex < 0 || list.length === 0) return;
      const next = (detailIndex + dir + list.length) % list.length;
      setDetailId(list[next].id);
    },
    [detailIndex, list],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas font-sans text-ink">
      <Toolbar
        supabase={supabase}
        userId={userId}
        project={project}
        projects={projects}
        sceneCount={list.length}
        cardSize={cardSize}
        minSize={MIN_SIZE}
        maxSize={MAX_SIZE}
        onCardSize={setCardSize}
        onAddScene={handleAddScene}
        scriptOpen={scriptOpen}
        onToggleScript={toggleScript}
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
        {scenes === null ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
            Loading scenes…
          </div>
        ) : (
          <Grid
            scenes={list}
            cardSize={cardSize}
            imageUrls={imageUrls}
            onOpenScene={setDetailId}
            onAddScene={handleAddScene}
            onReorder={handleReorder}
          />
        )}
        {scriptOpen && (
          <ScriptPanel
            supabase={supabase}
            userId={userId}
            projectId={project.id}
            onClose={toggleScript}
          />
        )}
      </div>

      {currentScene && (
        <SceneDetail
          scene={currentScene}
          number={detailIndex + 1}
          imageUrl={currentScene.image_path ? imageUrls[currentScene.image_path] : undefined}
          onClose={() => setDetailId(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onSaveFields={handleSaveFields}
          onUploadImage={handleUploadImage}
          onRemoveImage={handleRemoveImage}
          onDownloadImage={handleDownloadImage}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
