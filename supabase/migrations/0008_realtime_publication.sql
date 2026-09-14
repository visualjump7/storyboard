-- ---------------------------------------------------------------------------
-- 0008_realtime_publication.sql
--
-- Makes the app's live updates actually fire.
--
-- Every board subscribes to postgres_changes (scenes filtered by project_id;
-- the script panel to script), and 0004/0005 set REPLICA IDENTITY FULL so
-- DELETE payloads carry enough columns to match those filters. But a table
-- only emits change events if it is in the `supabase_realtime` publication —
-- and on the live database that publication was empty. Every subscription
-- connected successfully and then received nothing, so a scene written from
-- the CLI never appeared until a reload.
--
-- Adds the tables the app subscribes to (scenes, script) and the ones already
-- prepared for it (scene_media, merch_quotes, merch_orders). Guarded per table
-- so a re-run, or a project where some are already published, is a no-op.
-- Realtime honours RLS, so subscribers still only ever see their own rows.
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
