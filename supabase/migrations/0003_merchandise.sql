-- ---------------------------------------------------------------------------
-- 0003_merchandise.sql
--
-- Adds a third project kind: 'merchandise' — a visual tracking board for
-- physical products. An item is a `scenes` row (name/description/status and
-- its images in `scene_media` are all reused); this migration adds only the
-- sourcing fields that have no existing home.
--
-- Adds:
--   * projects.kind        — now also accepts 'merchandise'
--   * scenes.status        — now also accepts 'sourcing', 'quoted', 'sample'
--   * scenes.supplier_url  — link to the company that manufactures the item
--   * scenes.cost          — unit cost to produce
--   * scenes.sale_price    — intended retail price
--   * scenes.dev_time      — free text, e.g. "4–6 weeks"
--
-- Safe to re-run: every statement is guarded or drop-then-add.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. projects.kind — allow 'merchandise'
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects add constraint projects_kind_check
  check (kind in ('storyboard', 'social', 'merchandise'));

-- ---------------------------------------------------------------------------
-- 2. scenes.status — one shared column across kinds, so the CHECK is the union
--    of every kind's stages. Social keeps idea/draft/ready/scheduled/posted;
--    merchandise uses idea/sourcing/quoted/sample/ready.
-- ---------------------------------------------------------------------------
alter table public.scenes drop constraint if exists scenes_status_check;
alter table public.scenes add constraint scenes_status_check
  check (status in (
    'idea', 'draft', 'ready', 'scheduled', 'posted',  -- social
    'sourcing', 'quoted', 'sample'                    -- merchandise
  ));

-- ---------------------------------------------------------------------------
-- 3. scenes — merchandise sourcing fields
--
--    cost and sale_price are nullable on purpose: NULL means "not researched
--    yet", which is different from a genuine 0. numeric(12,2) rather than a
--    float so money arithmetic stays exact.
-- ---------------------------------------------------------------------------
alter table public.scenes
  add column if not exists supplier_url text not null default '';

alter table public.scenes
  add column if not exists cost numeric(12,2);

alter table public.scenes
  add column if not exists sale_price numeric(12,2);

alter table public.scenes
  add column if not exists dev_time text not null default '';
