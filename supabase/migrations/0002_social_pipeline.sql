-- ============================================================================
-- Migration 0002 — social-post pipelines.
-- Run this ONCE in the Supabase SQL editor on an existing database.
-- Take a database backup first (Dashboard → Database → Backups).
-- Idempotent and safe to re-run.
--
-- Adds:
--   * projects.kind        — 'storyboard' (default) or 'social'
--   * projects.share_token — unguessable token for the read-only /share page
--   * scenes.copy / status / scheduled_at / platforms — post fields
--     (storyboard rows keep their defaults and ignore them)
--   * scene_media          — ordered images/videos per social post
--
-- Purely additive: the currently-deployed app keeps working after this runs.
-- For a brand-new project, run schema.sql instead — it already includes this.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects.kind — which UI a project gets
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists kind text not null default 'storyboard';

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS; drop-then-add keeps re-runs safe.
alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects add constraint projects_kind_check
  check (kind in ('storyboard', 'social'));

-- ---------------------------------------------------------------------------
-- 2. projects.share_token — read-only share links.
--    The volatile default is evaluated PER ROW, so every existing project gets
--    its own distinct token (nothing is exposed until a link is shared).
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists projects_share_token_key
  on public.projects (share_token);

-- ---------------------------------------------------------------------------
-- 3. scenes — post fields (a "post" is a scenes row in a kind='social' project)
-- ---------------------------------------------------------------------------
alter table public.scenes
  add column if not exists copy text not null default '';

alter table public.scenes
  add column if not exists status text not null default 'draft';

alter table public.scenes drop constraint if exists scenes_status_check;
alter table public.scenes add constraint scenes_status_check
  check (status in ('idea', 'draft', 'ready', 'scheduled', 'posted'));

alter table public.scenes
  add column if not exists scheduled_at timestamptz;

alter table public.scenes
  add column if not exists platforms text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 4. scene_media — ordered media (images/videos) for social posts.
--    Objects reuse the existing private "scene-images" bucket with the same
--    "{user_id}/{scene_id}/{uuid}.{ext}" path convention, so the existing
--    storage policies and folder-cleanup code cover them unchanged.
--    NOTE: the bucket sets no per-file limit here; Supabase's project-level
--    upload cap applies (50MB by default — raise it under Storage → Settings
--    if you push larger videos).
-- ---------------------------------------------------------------------------
create table if not exists public.scene_media (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scene_id   uuid not null references public.scenes (id) on delete cascade,
  kind       text not null check (kind in ('image', 'video')),
  path       text not null,               -- object path in the scene-images bucket
  position   int  not null default 0,     -- display order within the post
  created_at timestamptz not null default now()
);

create index if not exists scene_media_scene_position_idx
  on public.scene_media (scene_id, position);

alter table public.scene_media enable row level security;

drop policy if exists "scene_media_select_own" on public.scene_media;
drop policy if exists "scene_media_insert_own" on public.scene_media;
drop policy if exists "scene_media_update_own" on public.scene_media;
drop policy if exists "scene_media_delete_own" on public.scene_media;

create policy "scene_media_select_own" on public.scene_media
  for select using (auth.uid() = user_id);
create policy "scene_media_insert_own" on public.scene_media
  for insert with check (auth.uid() = user_id);
create policy "scene_media_update_own" on public.scene_media
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scene_media_delete_own" on public.scene_media
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- If the app or CLI reports "column ... schema cache" right after this runs,
-- PostgREST hasn't reloaded yet; it does so automatically within seconds, or
-- force it with:  notify pgrst, 'reload schema';
-- ---------------------------------------------------------------------------
