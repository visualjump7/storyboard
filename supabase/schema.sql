-- ============================================================================
-- Storyboard — database schema, Row Level Security, and Storage policies.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- This is the CURRENT schema for a FRESH project: multi-project, with each
-- project being either a film storyboard (kind='storyboard') or a social-post
-- pipeline (kind='social' — posts with copy, media, schedule, status). To
-- upgrade an existing database run the numbered files in supabase/migrations/
-- instead — they preserve existing data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- projects (a user can have many; each owns its own scenes + script).
-- kind picks the UI: 'storyboard' (scene board) or 'social' (post pipeline).
-- share_token backs the public read-only /share/{token} review page.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled project',
  description text not null default '',
  kind        text not null default 'storyboard'
              check (kind in ('storyboard', 'social', 'merchandise')),
  share_token uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_idx
  on public.projects (user_id, created_at);

create unique index if not exists projects_share_token_key
  on public.projects (share_token);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scenes (belong to a project; ordering is per-project).
-- In a kind='social' project each row is a POST: copy/status/scheduled_at/
-- platforms are meaningful and media lives in scene_media. Storyboard rows
-- keep those columns at their defaults and use image_path as before.
-- ---------------------------------------------------------------------------
create table if not exists public.scenes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  order_index  int  not null default 0,
  name         text not null default '',
  description  text not null default '',
  prompt       text not null default '',
  image_path   text,                      -- storyboard image path, or null
  copy         text not null default '',  -- social: the post's caption/body text
  -- One shared stage column: the CHECK is the union of every kind's stages.
  status       text not null default 'draft'
               check (status in ('idea', 'draft', 'ready', 'scheduled', 'posted',
                                 'concept', 'sourcing', 'quotes', 'orders')),
  scheduled_at timestamptz,               -- social: when the post should go out
  platforms    text[] not null default '{}',  -- social: target platform slugs
  sale_price   numeric(12,2),             -- merch: retail price (null = unknown)
  dev_time     text not null default '',  -- merch: dev time, e.g. '4-6 weeks'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists scenes_project_order_idx
  on public.scenes (project_id, order_index);

alter table public.scenes enable row level security;

drop policy if exists "scenes_select_own" on public.scenes;
drop policy if exists "scenes_insert_own" on public.scenes;
drop policy if exists "scenes_update_own" on public.scenes;
drop policy if exists "scenes_delete_own" on public.scenes;

create policy "scenes_select_own" on public.scenes
  for select using (auth.uid() = user_id);
create policy "scenes_insert_own" on public.scenes
  for insert with check (auth.uid() = user_id);
create policy "scenes_update_own" on public.scenes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scenes_delete_own" on public.scenes
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scene_media (social posts: ordered images/videos; a post can have many).
-- Objects live in the same private scene-images bucket under the same
-- "{user_id}/{scene_id}/{uuid}.{ext}" convention, so the storage policies and
-- folder-cleanup code below cover them with no extra rules.
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

-- Merchandise: many suppliers and many orders per product. See
-- migrations/0005_merch_quotes_orders.sql for the full definitions,
-- RLS policies, and replica identity.
create table if not exists public.merch_quotes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scene_id   uuid not null references public.scenes (id) on delete cascade,
  supplier   text not null default '',
  contact    text not null default '',
  url        text not null default '',
  unit_cost  numeric(12,2),             -- null = a sourcing lead, not a quote
  moq        int,
  lead_time  text not null default '',
  notes      text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merch_orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  scene_id    uuid not null references public.scenes (id) on delete cascade,
  supplier    text not null default '',
  quantity    int,
  unit_cost   numeric(12,2),
  ordered_at  date,
  expected_at date,
  status      text not null default 'placed'
              check (status in ('placed','in_production','shipped','received','cancelled')),
  notes       text not null default '',
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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
-- script (one row PER PROJECT; social projects use it as planning "Notes")
-- ---------------------------------------------------------------------------
create table if not exists public.script (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

create unique index if not exists script_project_id_key
  on public.script (project_id);             -- enables upsert on project_id

alter table public.script enable row level security;

drop policy if exists "script_select_own" on public.script;
drop policy if exists "script_insert_own" on public.script;
drop policy if exists "script_update_own" on public.script;
drop policy if exists "script_delete_own" on public.script;

create policy "script_select_own" on public.script
  for select using (auth.uid() = user_id);
create policy "script_insert_own" on public.script
  for insert with check (auth.uid() = user_id);
create policy "script_update_own" on public.script
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "script_delete_own" on public.script
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: the "scene-images" bucket (created here, kept private). Despite the
-- name it holds ALL scene/post media — images and videos.
--
-- The app displays media with short-lived signed URLs, so the bucket must be
-- private. This insert creates it and re-asserts Public=OFF on every run, so
-- the privacy guarantee can't drift from a manual dashboard toggle.
-- (If your project blocks writing to storage.buckets from the SQL editor,
-- create a bucket named "scene-images" with Public OFF in the dashboard.)
--
-- Object paths stay "{user_id}/{scene_id}/{uuid}.{ext}" — scene ids are globally
-- unique, so projects need no path segment and no media ever moves between
-- projects. RLS still scopes by the first segment (user_id). No per-file size
-- limit is set here; Supabase's project-level cap applies (50MB by default —
-- raise it under Storage → Settings for larger videos). The public /share page
-- signs URLs server-side with the service role, so no anon policy is needed.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('scene-images', 'scene-images', false)
on conflict (id) do update set public = false;

-- ---------------------------------------------------------------------------
-- Storage policies. Object paths are "{user_id}/{scene_id}/{uuid}.{ext}", so
-- the first folder segment is the owner's user id. These policies restrict
-- read/write to objects under the caller's own {user_id}/ prefix.
-- NOTE: only the first segment ({user_id}) is enforced; {scene_id} is
-- conventional and not validated against the scenes table — sufficient for a
-- single-owner app (no cross-tenant exposure).
-- ---------------------------------------------------------------------------
drop policy if exists "scene_images_select_own" on storage.objects;
drop policy if exists "scene_images_insert_own" on storage.objects;
drop policy if exists "scene_images_update_own" on storage.objects;
drop policy if exists "scene_images_delete_own" on storage.objects;

create policy "scene_images_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scene-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "scene_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scene-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "scene_images_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'scene-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'scene-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "scene_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scene-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
