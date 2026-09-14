-- ---------------------------------------------------------------------------
-- 0010_characters.sql
--
-- Adds a sixth project kind: 'character' — a character sheet. Each item is one
-- character: reference images, an optional turnaround video, a voice-reference
-- audio clip, a profile, the visual-DNA generation prompt, and a link out
-- (voice model, design doc). It shares the showcase surface with game and
-- music, so no new columns: name/description/prompt/link_url/status and
-- scene_media already hold everything.
--
-- Adds:
--   * projects.kind   — now also accepts 'character'
--   * scenes.status   — character stages: concept (already present, shared
--                       with merchandise) → design → approved → locked
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects add constraint projects_kind_check
  check (kind in ('storyboard', 'social', 'merchandise', 'game', 'music', 'character'));

-- One shared stage column across kinds, so the CHECK is the union of them all.
alter table public.scenes drop constraint if exists scenes_status_check;
alter table public.scenes add constraint scenes_status_check
  check (status in (
    'idea', 'draft', 'ready', 'scheduled', 'posted',       -- social
    'concept', 'sourcing', 'quotes', 'orders',             -- merchandise (+ character: concept)
    'prototype', 'in_development', 'playable', 'released', -- game
    'demo', 'recorded', 'mixed', 'mastered', 'submitted',  -- music
    'design', 'approved', 'locked'                         -- character
  ));

notify pgrst, 'reload schema';
