-- ---------------------------------------------------------------------------
-- 0005_merch_quotes_orders.sql
--
-- Reshapes merchandise from "one product, one supplier, one cost" into a
-- product that collects many quotes and many orders.
--
-- Stage rename: idea → concept, quoted → quotes, sample → orders.
--
-- Adds:
--   * merch_quotes — potential suppliers; a quote is one with a price filled in
--   * merch_orders — orders placed against a product
--
-- Removes (after backfilling into merch_quotes):
--   * scenes.supplier_url, scenes.cost — single-value fields, now per quote
--
-- scenes.sale_price stays (one target retail price per product) as does
-- scenes.dev_time (overall development time; per-supplier lead time lives on
-- the quote).
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Stage values. Widen the CHECK first so the data migration can't violate
--    it mid-flight, then rename, then narrow to the final set.
-- ---------------------------------------------------------------------------
alter table public.scenes drop constraint if exists scenes_status_check;

update public.scenes set status = 'concept' where status = 'idea';
update public.scenes set status = 'quotes'  where status = 'quoted';
update public.scenes set status = 'orders'  where status = 'sample';

alter table public.scenes add constraint scenes_status_check
  check (status in (
    'idea', 'draft', 'ready', 'scheduled', 'posted',      -- social
    'concept', 'sourcing', 'quotes', 'orders'             -- merchandise
  ));

-- ---------------------------------------------------------------------------
-- 2. merch_quotes — one row per potential supplier. A row with no unit_cost is
--    a sourcing lead; filling in the cost turns it into a quote. unit_cost and
--    moq are nullable so "not quoted yet" stays distinct from a genuine 0.
-- ---------------------------------------------------------------------------
create table if not exists public.merch_quotes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scene_id   uuid not null references public.scenes (id) on delete cascade,
  supplier   text not null default '',
  contact    text not null default '',   -- name / email / phone, free text
  url        text not null default '',
  unit_cost  numeric(12,2),
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
-- 3. merch_orders — an order placed against a product. The line total is
--    quantity x unit_cost, derived on render rather than stored, so it can't
--    drift out of step with its parts.
-- ---------------------------------------------------------------------------
create table if not exists public.merch_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  scene_id     uuid not null references public.scenes (id) on delete cascade,
  supplier     text not null default '',
  quantity     int,
  unit_cost    numeric(12,2),
  ordered_at   date,
  expected_at  date,
  status       text not null default 'placed'
               check (status in ('placed', 'in_production', 'shipped', 'received', 'cancelled')),
  notes        text not null default '',
  position     int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
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

-- Deletes must reach open browsers; see 0004.
alter table public.merch_quotes replica identity full;
alter table public.merch_orders replica identity full;

-- ---------------------------------------------------------------------------
-- 4. Backfill the old single-value fields into a first quote, then drop them.
--    Guarded on there being no quotes yet for that product, so a re-run can't
--    duplicate the row.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scenes' and column_name = 'cost'
  ) then
    insert into public.merch_quotes (user_id, scene_id, supplier, url, unit_cost, position)
    select s.user_id, s.id, '', coalesce(s.supplier_url, ''), s.cost, 0
    from public.scenes s
    join public.projects p on p.id = s.project_id
    where p.kind = 'merchandise'
      and (s.cost is not null or coalesce(s.supplier_url, '') <> '')
      and not exists (select 1 from public.merch_quotes q where q.scene_id = s.id);
  end if;
end $$;

alter table public.scenes drop column if exists supplier_url;
alter table public.scenes drop column if exists cost;
