-- ============================================================================
-- Storyboard — Cowork integration: RPC helpers + Realtime.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run (CREATE OR REPLACE / guarded publication adds).
--
-- These functions let an external agent (Claude via the Supabase connector, or
-- any service-role caller) create/edit scenes and the script with correct
-- order_index / user_id handling — without the agent needing to know the
-- ordering rules or the owner's user id.
--
-- Single-owner app: when there is no auth context (auth.uid() is null, e.g. a
-- service connection) the functions target the sole owner in auth.users.
-- They are SECURITY DEFINER so they work from a service connection; execute is
-- granted only to authenticated + service_role (never anon), and there is no
-- public sign-up, so only the owner can reach them.
-- ============================================================================

-- Effective owner: the authenticated user, or (no auth context) the sole owner.
create or replace function public.cowork_owner()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.uid(),
    (select id from auth.users order by created_at asc limit 1)
  );
$$;

-- Create a scene at the end of the board. Returns the new row.
create or replace function public.cowork_create_scene(
  p_name        text default '',
  p_description text default '',
  p_prompt      text default ''
)
returns public.scenes
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid := public.cowork_owner();
  v_order int;
  v_row   public.scenes;
begin
  if v_owner is null then
    raise exception 'No owner found (auth.users is empty).';
  end if;

  select coalesce(max(order_index), -1) + 1
    into v_order
    from public.scenes
   where user_id = v_owner;

  insert into public.scenes (user_id, order_index, name, description, prompt)
  values (v_owner, v_order, coalesce(p_name, ''), coalesce(p_description, ''), coalesce(p_prompt, ''))
  returning * into v_row;

  return v_row;
end;
$$;

-- Update a scene's text fields. Null args leave that field unchanged.
create or replace function public.cowork_update_scene(
  p_id          uuid,
  p_name        text default null,
  p_description text default null,
  p_prompt      text default null
)
returns public.scenes
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid := public.cowork_owner();
  v_row   public.scenes;
begin
  update public.scenes
     set name        = coalesce(p_name, name),
         description = coalesce(p_description, description),
         prompt      = coalesce(p_prompt, prompt),
         updated_at  = now()
   where id = p_id and user_id = v_owner
  returning * into v_row;

  if not found then
    raise exception 'Scene % not found for owner.', p_id;
  end if;
  return v_row;
end;
$$;

-- Delete a scene and compact order_index (0..n-1) for the rest.
-- NOTE: does NOT remove the scene's Storage image objects. For scenes that
-- have an uploaded image, prefer deleting via the app UI (which cleans Storage),
-- or handle Storage cleanup in a later phase.
create or replace function public.cowork_delete_scene(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid := public.cowork_owner();
begin
  delete from public.scenes where id = p_id and user_id = v_owner;

  with ranked as (
    select id, row_number() over (order by order_index, created_at) - 1 as rn
      from public.scenes
     where user_id = v_owner
  )
  update public.scenes s
     set order_index = r.rn
    from ranked r
   where s.id = r.id and s.order_index <> r.rn;
end;
$$;

-- Set the absolute order. p_ids is the desired order; any of the owner's scenes
-- not listed are appended after, preserving their current relative order.
-- Writes contiguous 0..n-1 indices.
create or replace function public.cowork_reorder_scenes(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid := public.cowork_owner();
begin
  with ranked as (
    select s.id,
           row_number() over (
             order by coalesce(array_position(p_ids, s.id), 2147483647), s.order_index
           ) - 1 as rn
      from public.scenes s
     where s.user_id = v_owner
  )
  update public.scenes s
     set order_index = r.rn
    from ranked r
   where s.id = r.id and s.order_index <> r.rn;
end;
$$;

-- Upsert the single script row for the owner.
create or replace function public.cowork_set_script(p_content text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid := public.cowork_owner();
begin
  insert into public.script (user_id, content, updated_at)
  values (v_owner, coalesce(p_content, ''), now())
  on conflict (user_id) do update
    set content = excluded.content, updated_at = now();
end;
$$;

-- List the owner's scenes in display order (convenience read).
create or replace function public.cowork_list_scenes()
returns setof public.scenes
language sql
stable
security definer
set search_path = public, auth
as $$
  select * from public.scenes where user_id = public.cowork_owner() order by order_index;
$$;

-- Allow the single owner (authenticated) and service-role callers to execute.
grant execute on function
  public.cowork_owner(),
  public.cowork_create_scene(text, text, text),
  public.cowork_update_scene(uuid, text, text, text),
  public.cowork_delete_scene(uuid),
  public.cowork_reorder_scenes(uuid[]),
  public.cowork_set_script(text),
  public.cowork_list_scenes()
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes on scenes + script so the app updates live
-- when an agent creates/edits them. REPLICA IDENTITY FULL ensures the user_id
-- filter and DELETE events work (default identity only carries the PK).
-- ---------------------------------------------------------------------------
alter table public.scenes replica identity full;
alter table public.script replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scenes'
  ) then
    alter publication supabase_realtime add table public.scenes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'script'
  ) then
    alter publication supabase_realtime add table public.script;
  end if;
end $$;
