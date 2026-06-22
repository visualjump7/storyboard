-- ============================================================================
-- Storyboard — database schema, Row Level Security, and Storage policies.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- scenes
-- ---------------------------------------------------------------------------
create table if not exists public.scenes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  order_index int  not null default 0,
  name        text not null default '',
  description text not null default '',
  prompt      text not null default '',
  image_path  text,                       -- path in the scene-images bucket, or null
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists scenes_user_order_idx
  on public.scenes (user_id, order_index);

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
-- script (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.script (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id)                          -- enables upsert on user_id
);

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
-- Storage: the "scene-images" bucket (created here, kept private).
--
-- The app displays images with short-lived signed URLs, so the bucket must be
-- private. This insert creates it and re-asserts Public=OFF on every run, so
-- the privacy guarantee can't drift from a manual dashboard toggle.
-- (If your project blocks writing to storage.buckets from the SQL editor,
-- create a bucket named "scene-images" with Public OFF in the dashboard.)
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
