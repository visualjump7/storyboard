-- ============================================================================
-- Migration 0001 — multi-project support.
-- Run this ONCE in the Supabase SQL editor on an existing single-board project.
-- Take a database backup first (Dashboard → Database → Backups).
-- Idempotent and safe to re-run: guards prevent double-backfill.
--
-- For a brand-new project, run schema.sql instead — it already includes all of
-- this. This migration only exists to upgrade a DB that predates projects.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects table (the new parent of scenes + script)
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled project',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_idx
  on public.projects (user_id, created_at);

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
-- 2. add project_id columns (nullable for now, so backfill can populate them)
-- ---------------------------------------------------------------------------
alter table public.scenes add column if not exists project_id uuid
  references public.projects (id) on delete cascade;
alter table public.script add column if not exists project_id uuid
  references public.projects (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. backfill: give every user with existing data a default "My Storyboard"
--    project, and attach their orphaned scenes + script to it.
--    The `where project_id is null` guards make this safe to re-run.
-- ---------------------------------------------------------------------------
insert into public.projects (user_id, name)
select distinct user_id, 'My Storyboard'
from (
  select user_id from public.scenes where project_id is null
  union
  select user_id from public.script where project_id is null
) needing;

update public.scenes s
set project_id = p.id
from public.projects p
where s.project_id is null
  and p.user_id = s.user_id;

update public.script sc
set project_id = p.id
from public.projects p
where sc.project_id is null
  and p.user_id = sc.user_id;

-- ---------------------------------------------------------------------------
-- 4. now that no rows are orphaned, require project_id going forward
-- ---------------------------------------------------------------------------
alter table public.scenes alter column project_id set not null;
alter table public.script alter column project_id set not null;

-- ---------------------------------------------------------------------------
-- 5. script becomes one row PER PROJECT (was one row per user).
--    Drop the old unique(user_id); enforce unique(project_id) for upsert.
-- ---------------------------------------------------------------------------
alter table public.script drop constraint if exists script_user_id_key;
create unique index if not exists script_project_id_key
  on public.script (project_id);

-- ---------------------------------------------------------------------------
-- 6. scene ordering is now per-project, not per-user
-- ---------------------------------------------------------------------------
drop index if exists public.scenes_user_order_idx;
create index if not exists scenes_project_order_idx
  on public.scenes (project_id, order_index);
