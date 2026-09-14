-- ---------------------------------------------------------------------------
-- 0009_workspace_required.sql
--
-- Phase 2 of the workspace layer: every project must belong to a workspace.
--
-- 0007 left projects.workspace_id NULLABLE because the app build and CLI
-- deployed at that moment still inserted projects without it. Run this ONLY
-- after the code that always sends workspace_id is live (web deploy done, sb
-- CLI updated) — otherwise "New project" and `sb project add` fail with a
-- not-null violation (23502).
--
-- If any project is still unfiled this migration STOPS and says so, rather
-- than guessing which workspace it belongs to. File it from the Unfiled
-- section on "/" (or `sb project move <project> <workspace>`) and re-run.
-- Guessing — e.g. sweeping stragglers into the owner's first workspace — is
-- exactly what the rest of this feature refuses to do anywhere else, and a
-- silent wrong filing is worse than a loud halt.
--
-- Safe to re-run: SET NOT NULL on a column that is already NOT NULL is a no-op.
-- ---------------------------------------------------------------------------

do $$
declare
  n int;
begin
  select count(*) into n from public.projects where workspace_id is null;
  if n > 0 then
    raise exception
      '0009: % project(s) are unfiled. File them from the Unfiled section on / (or `sb project move`) and re-run.',
      n;
  end if;
end $$;

alter table public.projects alter column workspace_id set not null;

notify pgrst, 'reload schema';
