-- ============================================================================
-- Storyboard — database schema, Row Level Security, and Storage policies.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- This is the CURRENT schema for a FRESH project: workspaces hold projects,
-- projects hold scenes (exactly one level of nesting). Each project has a
-- kind that picks its UI — a film storyboard ('storyboard'), a social-post
-- pipeline ('social' — posts with copy, media, schedule, status), a
-- merchandise board ('merchandise' — products with quotes and orders), or a
-- showcase of games ('game') or music tracks ('music'). To upgrade an existing
-- database run the numbered files in supabase/migrations/ (0001 → 0009, in
-- order) instead — they preserve existing data. This file mirrors what those
-- migrations produce.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- workspaces (one parent level above projects; a user can have many).
-- Exactly one level of nesting — workspaces hold projects, projects hold
-- scenes. A workspace is its own table rather than a self-referencing
-- projects.parent_id, so a workspace can never be mistaken for a board by the
-- project page, the share page, or the CLI. Created before projects because
-- projects.workspace_id references it.
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled workspace',
  description text not null default '',
  order_index int  not null default 0,     -- position on the workspace index
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workspaces_user_order_idx
  on public.workspaces (user_id, order_index, created_at);

alter table public.workspaces enable row level security;

drop policy if exists "workspaces_select_own" on public.workspaces;
drop policy if exists "workspaces_insert_own" on public.workspaces;
drop policy if exists "workspaces_update_own" on public.workspaces;
drop policy if exists "workspaces_delete_own" on public.workspaces;

create policy "workspaces_select_own" on public.workspaces
  for select using (auth.uid() = user_id);
create policy "workspaces_insert_own" on public.workspaces
  for insert with check (auth.uid() = user_id);
create policy "workspaces_update_own" on public.workspaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workspaces_delete_own" on public.workspaces
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- projects (belong to a workspace; a user can have many; each owns its own
-- scenes + script). Ordering is per-workspace.
-- kind picks the UI: 'storyboard' (scene board), 'social' (post pipeline),
-- 'merchandise' (product board), 'game' or 'music' (showcase).
-- share_token backs the public read-only /share/{token} review page.
--
-- workspace_id is ON DELETE NO ACTION (the default), NOT cascade. A cascade
-- would chain workspace → projects → scenes → media rows and leave every
-- Storage object behind, because Postgres cascades never touch Storage.
-- Deleting a workspace is refused while it still holds projects.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id),
  order_index  int  not null default 0,   -- position within its workspace
  name         text not null default 'Untitled project',
  description  text not null default '',
  kind         text not null default 'storyboard'
               check (kind in ('storyboard', 'social', 'merchandise', 'game', 'music')),
  share_token  uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Re-runs on a database that predates workspaces: CREATE TABLE IF NOT EXISTS
-- skips the existing table, so add the two columns separately as well.
-- workspace_id is nullable in this form because existing rows cannot satisfy
-- NOT NULL — migrations/0007_workspaces.sql backfills them. No-ops on a fresh
-- install (the columns already exist).
alter table public.projects
  add column if not exists workspace_id uuid references public.workspaces (id);

alter table public.projects
  add column if not exists order_index int not null default 0;

create index if not exists projects_user_idx
  on public.projects (user_id, created_at);

create index if not exists projects_workspace_order_idx
  on public.projects (workspace_id, order_index, created_at);

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
-- platforms are meaningful and media lives in scene_media. In a 'merchandise'
-- project each row is a PRODUCT (sale_price/dev_time here; its suppliers and
-- orders live in merch_quotes/merch_orders). In a 'game' or 'music' project
-- each row is an ITEM with a link_url out to play/listen. Storyboard rows
-- keep those columns at their defaults and use image_path as before (and can
-- carry clips in scene_media too).
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
               check (status in (
                 'idea', 'draft', 'ready', 'scheduled', 'posted',       -- social
                 'concept', 'sourcing', 'quotes', 'orders',             -- merchandise
                 'prototype', 'in_development', 'playable', 'released', -- game
                 'demo', 'recorded', 'mixed', 'mastered', 'submitted'   -- music
               )),
  scheduled_at timestamptz,               -- social: when the post should go out
  platforms    text[] not null default '{}',  -- social: target platform slugs
  sale_price   numeric(12,2),             -- merch: retail price (null = unknown)
  dev_time     text not null default '',  -- merch: dev time, e.g. '4-6 weeks'
  link_url     text not null default '',  -- game/music: where to play/listen
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

-- DELETE events must reach open browsers over realtime. Under the default
-- replica identity Postgres puts only the primary key in a DELETE's old-row
-- payload; every subscription in the app filters on project_id, so the event
-- was dropped and a scene removed elsewhere (the sb CLI, another tab) stayed
-- on screen until a reload. FULL puts the whole old row in the payload.
-- (Mirrors migrations/0004_realtime_deletes.sql.)
alter table public.scenes replica identity full;

-- ---------------------------------------------------------------------------
-- scene_media (ordered images/videos/audio per scene; a row can have many).
-- Every project kind can carry media; 'audio' exists for music tracks.
-- Objects live in the same private scene-images bucket under the same
-- "{user_id}/{scene_id}/{uuid}.{ext}" convention, so the storage policies and
-- folder-cleanup code below cover them with no extra rules.
-- ---------------------------------------------------------------------------
create table if not exists public.scene_media (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scene_id   uuid not null references public.scenes (id) on delete cascade,
  kind       text not null check (kind in ('image', 'video', 'audio')),
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

-- Deletes must reach open browsers; see the note on scenes above.
alter table public.scene_media replica identity full;

-- ---------------------------------------------------------------------------
-- Merchandise: many suppliers and many orders per product (a product is a
-- scenes row in a kind='merchandise' project). Mirrors
-- migrations/0005_merch_quotes_orders.sql.
--
-- merch_quotes — one row per potential supplier. A row with no unit_cost is a
-- sourcing lead; filling in the cost turns it into a quote. unit_cost and moq
-- are nullable so "not quoted yet" stays distinct from a genuine 0.
-- ---------------------------------------------------------------------------
create table if not exists public.merch_quotes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scene_id   uuid not null references public.scenes (id) on delete cascade,
  supplier   text not null default '',
  contact    text not null default '',   -- name / email / phone, free text
  url        text not null default '',
  unit_cost  numeric(12,2),             -- null = a sourcing lead, not a quote
  moq        int,                        -- minimum order quantity
  lead_time  text not null default '',   -- e.g. '4-6 weeks'
  notes      text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merch_quotes_scene_position_idx
  on public.merch_quotes (scene_id, position);

alter table public.merch_quotes enable row level security;

drop policy if exists "merch_quotes_select_own" on public.merch_quotes;
drop policy if exists "merch_quotes_insert_own" on public.merch_quotes;
drop policy if exists "merch_quotes_update_own" on public.merch_quotes;
drop policy if exists "merch_quotes_delete_own" on public.merch_quotes;

create policy "merch_quotes_select_own" on public.merch_quotes
  for select using (auth.uid() = user_id);
create policy "merch_quotes_insert_own" on public.merch_quotes
  for insert with check (auth.uid() = user_id);
create policy "merch_quotes_update_own" on public.merch_quotes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "merch_quotes_delete_own" on public.merch_quotes
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- merch_orders — an order placed against a product. The line total is
-- quantity x unit_cost, derived on render rather than stored, so it can't
-- drift out of step with its parts.
-- ---------------------------------------------------------------------------
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

create index if not exists merch_orders_scene_position_idx
  on public.merch_orders (scene_id, position);

alter table public.merch_orders enable row level security;

drop policy if exists "merch_orders_select_own" on public.merch_orders;
drop policy if exists "merch_orders_insert_own" on public.merch_orders;
drop policy if exists "merch_orders_update_own" on public.merch_orders;
drop policy if exists "merch_orders_delete_own" on public.merch_orders;

create policy "merch_orders_select_own" on public.merch_orders
  for select using (auth.uid() = user_id);
create policy "merch_orders_insert_own" on public.merch_orders
  for insert with check (auth.uid() = user_id);
create policy "merch_orders_update_own" on public.merch_orders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "merch_orders_delete_own" on public.merch_orders
  for delete using (auth.uid() = user_id);

-- Deletes must reach open browsers; see the note on scenes above.
alter table public.merch_quotes replica identity full;
alter table public.merch_orders replica identity full;

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
-- name it holds ALL scene/post media — images, videos, and audio.
--
-- The app displays media with short-lived signed URLs, so the bucket must be
-- private. This insert creates it and re-asserts Public=OFF on every run, so
-- the privacy guarantee can't drift from a manual dashboard toggle.
-- (If your project blocks writing to storage.buckets from the SQL editor,
-- create a bucket named "scene-images" with Public OFF in the dashboard.)
--
-- Object paths stay "{user_id}/{scene_id}/{uuid}.{ext}" — scene ids are globally
-- unique, so projects and workspaces need no path segment and no media ever
-- moves between projects. RLS still scopes by the first segment (user_id). No
-- per-file size limit is set here; Supabase's project-level cap applies (50MB
-- by default — raise it under Storage → Settings for larger videos). The
-- public /share page signs URLs server-side with the service role, so no anon
-- policy is needed.
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

-- ---------------------------------------------------------------------------
-- Realtime (mirrors 0008_realtime_publication.sql).
-- A table only emits postgres_changes events if it is in the supabase_realtime
-- publication; the app subscribes to scenes and script, and the others are
-- prepared for it (replica identity full above). Guarded per table so re-runs
-- are no-ops. Realtime honours RLS, so subscribers still see only their rows.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['scenes', 'scene_media', 'script', 'merch_quotes', 'merch_orders']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
