-- ---------------------------------------------------------------------------
-- 0006_games_music.sql
--
-- Adds two showcase project kinds:
--   * game  — playable games: screenshots, a short video, a summary, a play link
--   * music — tracks being submitted to Spotify: cover art, audio, a listen link
--
-- Both are "an item with media, a summary, a link out, and a stage", so they
-- share one surface rather than growing two near-identical ones.
--
-- Adds:
--   * projects.kind      — now also accepts 'game' and 'music'
--   * scenes.link_url    — where to play/listen
--   * scenes.status      — game and music stages
--   * scene_media.kind   — now also accepts 'audio' (music needs it)
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects add constraint projects_kind_check
  check (kind in ('storyboard', 'social', 'merchandise', 'game', 'music'));

-- One shared stage column across kinds, so the CHECK is the union of them all.
alter table public.scenes drop constraint if exists scenes_status_check;
alter table public.scenes add constraint scenes_status_check
  check (status in (
    'idea', 'draft', 'ready', 'scheduled', 'posted',      -- social
    'concept', 'sourcing', 'quotes', 'orders',            -- merchandise
    'prototype', 'in_development', 'playable', 'released',-- game
    'demo', 'recorded', 'mixed', 'mastered', 'submitted'  -- music
  ));

-- Where to play the game / listen to the track.
alter table public.scenes
  add column if not exists link_url text not null default '';

-- Music needs audio uploads; the bucket already holds images and video.
alter table public.scene_media drop constraint if exists scene_media_kind_check;
alter table public.scene_media add constraint scene_media_kind_check
  check (kind in ('image', 'video', 'audio'));
