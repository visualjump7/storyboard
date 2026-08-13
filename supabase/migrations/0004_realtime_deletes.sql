-- ---------------------------------------------------------------------------
-- 0004_realtime_deletes.sql
--
-- Makes DELETE events usable over realtime.
--
-- Under the default replica identity Postgres puts only the primary key in a
-- DELETE's old-row payload. Every subscription in the app filters on
-- project_id, so a delete's payload had no project_id to match and the event
-- was dropped — a scene or item removed elsewhere (the sb CLI, another tab)
-- stayed on screen until a reload.
--
-- REPLICA IDENTITY FULL puts the whole old row in the payload, so the filter
-- matches and the client can remove it. The cost is that UPDATEs also carry
-- the full old row; at this table's size that is not meaningful.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.scenes replica identity full;
alter table public.scene_media replica identity full;
