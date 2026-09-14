-- ---------------------------------------------------------------------------
-- 0007_workspaces.sql
--
-- Adds one parent level above projects: a WORKSPACE. Phantom Ranch is a
-- workspace holding the five existing projects; Roaring Pines will be another.
-- Exactly one level of nesting — workspaces hold projects, projects hold
-- scenes. A workspace is its own table rather than a self-referencing
-- projects.parent_id, so a workspace can never be mistaken for a board by the
-- project page, the share page, or the CLI.
--
-- Adds:
--   * public.workspaces        — user-owned, RLS like every other table
--   * projects.workspace_id    — FK, NULLABLE in this migration (see below)
--   * projects.order_index     — position within its workspace
--   * workspaces.order_index   — position on the workspace index
--
-- Nothing else moves. projects.id and share_token are untouched, so every
-- /p/{id} URL and /share/{token} link keeps working. Storage paths carry no
-- project or workspace segment, so no object moves.
--
-- workspace_id stays NULLABLE here on purpose: the deployed app and any older
-- copy of the sb CLI insert projects without it. It is tightened to NOT NULL
-- in a later migration, after the code that always sends it has shipped.
--
-- The FK is ON DELETE NO ACTION (the default), NOT cascade. A cascade would
-- chain workspace -> projects -> scenes -> media rows and leave every Storage
-- object behind, because Postgres cascades never touch Storage. Deleting a
-- workspace is refused while it still holds projects.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. workspaces
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled workspace',
  description text not null default '',
  order_index int  not null default 0,
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
-- 2. projects: parent link + ordering
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists workspace_id uuid references public.workspaces (id);

alter table public.projects
  add column if not exists order_index int not null default 0;

create index if not exists projects_workspace_order_idx
  on public.projects (workspace_id, order_index, created_at);

-- ---------------------------------------------------------------------------
-- 3. Backfill: file the five existing projects under "Phantom Ranch".
--
--    Restricted to the five verified ids rather than "every project with a
--    null workspace_id" so a re-run can never sweep a later project into the
--    wrong workspace. The workspace is looked up by name before it is created,
--    so a re-run reuses it instead of making a second Phantom Ranch.
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid;
  ws    uuid;
begin
  select user_id into owner
  from public.projects
  where id = 'cf52e802-6939-4a47-8a89-23f64069237a';

  if owner is null then
    return;  -- fresh database: nothing to backfill
  end if;

  -- Already filed (a re-run): nothing to do — and in particular do not create
  -- a second "Phantom Ranch" because the original has since been renamed.
  if not exists (
    select 1 from public.projects
    where workspace_id is null
      and id in (
        'cf52e802-6939-4a47-8a89-23f64069237a',
        'ed27be82-f666-4613-800e-df38f417b6f1',
        '5161eb5b-7977-420f-9f8b-48073decbe5d',
        '9646e6d2-44b2-433c-8d09-173c8eaff697',
        'ec0bc7e6-d252-41c7-aa1e-cf441c6bfcbe'
      )
  ) then
    return;
  end if;

  select id into ws
  from public.workspaces
  where user_id = owner and name = 'Phantom Ranch'
  limit 1;

  if ws is null then
    insert into public.workspaces (user_id, name, order_index)
    values (owner, 'Phantom Ranch', 0)
    returning id into ws;
  end if;

  update public.projects
  set workspace_id = ws
  where workspace_id is null
    and id in (
      'cf52e802-6939-4a47-8a89-23f64069237a',  -- Social Media Campaign - Month 1
      'ed27be82-f666-4613-800e-df38f417b6f1',  -- Merchandise
      '5161eb5b-7977-420f-9f8b-48073decbe5d',  -- Music - Raven Krow Phantom Ranch
      '9646e6d2-44b2-433c-8d09-173c8eaff697',  -- Shorts Lorenzo's Logic
      'ec0bc7e6-d252-41c7-aa1e-cf441c6bfcbe'   -- Episode 1 - The Extraction
    );
end $$;

-- ---------------------------------------------------------------------------
-- 4. Ordering backfill: number projects within each workspace by creation
--    date, but only while nothing has ever been ordered — once any project
--    carries a non-zero order_index, a re-run must not overwrite the user's
--    arrangement.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.projects where order_index > 0) then
    with ranked as (
      select id,
             row_number() over (partition by workspace_id order by created_at) - 1 as rn
      from public.projects
    )
    update public.projects p
    set order_index = ranked.rn
    from ranked
    where ranked.id = p.id;
  end if;
end $$;

-- PostgREST caches the schema; ask it to pick up the new table and columns.
notify pgrst, 'reload schema';
