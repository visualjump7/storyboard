# Storyboard — notes for Claude

A single-user cloud storyboard app (Next.js 14 + Supabase). The user can have many
**projects** (storyboards); each project owns its own **scenes** (name, description,
generation **prompt**, **image**) and its own screenplay **script**. The browser app
is just one client; the **source of truth is Supabase** (Postgres `projects` +
`scenes` + `script` tables, private Storage bucket `scene-images`), reachable from any
machine. URLs: `/` lists projects, `/p/{projectId}` is one board.

## Pushing to the storyboard (the `sb` CLI)

When the user wants to add/update projects, scenes, prompts, or images "in the
storyboard," use the agent CLI — do not tell them to use the browser. It writes to the
same Supabase backend the deployed app reads from, so changes appear instantly.

Scene commands act on the **current project** (remembered in the gitignored
`.sb-state.json`). Always confirm which project you're operating on — when in doubt,
run `npm run sb -- projects` and ask the user, or pass `--project`.

```
npm run sb -- projects                   # list projects (● = current)
npm run sb -- project add "Tornado Film" # create a project + make it current
npm run sb -- project use "Tornado Film" # switch the current project
npm run sb -- project rename 2 "New name"
npm run sb -- project rm 3               # deletes the project + all its scenes/images

npm run sb -- list                       # read the current project's board
npm run sb -- add --name "Opening" --prompt "wide drone shot at dawn" --image ./shot.png
npm run sb -- set 2 --prompt "tighter framing, golden hour"
npm run sb -- image 2 https://example.com/generated.png   # local path OR url
npm run sb -- rm 3
npm run sb -- script get
npm run sb -- script set ./script.md
npm run sb -- add --project "Other Film" --prompt "..."   # one-off scope override
```

- `<project>` is an index from `projects`, a name, a full UUID, or an id prefix.
- `<scene>` is a **1-based index** from `list`, a full UUID, or an id prefix.
- Scene commands print `Using project: X` (to stderr) so you can confirm the target.
- `--project <project>` scopes a single scene command without changing the current one.
- `--image` takes a **local file path or an http(s) URL** (URLs are downloaded then
  uploaded). Useful for piping in an image you just generated (Higgsfield, etc.).
- `add` places the scene at the end of the current project's board.

### Picking the right project

If the user names a project, `project use` it (or pass `--project`) before acting. If
they don't and more than one project exists, the CLI refuses scene commands and lists
them — surface that to the user and ask which one rather than guessing.

### When `sb` reports it's not configured

It needs a gitignored `.env.local` on this machine (it is never pulled from GitHub).
Tell the user to create it from `.env.local.example`, specifically:
`SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API → service_role, SECRET)
and `STORYBOARD_OWNER_EMAIL`. The CLI prints these exact instructions on failure.

## App architecture (for reference)

- `src/lib/types.ts` — `Project`, `Scene`, `ScriptRow` types and `SCENE_IMAGES_BUCKET`.
- `src/lib/projects.ts` — project CRUD (delete also clears the project's image folders).
- `src/lib/scenes.ts` / `src/lib/script.ts` — scene + script ops, scoped by `project_id`.
- `src/lib/storage.ts` — browser-side image upload + signed-URL helpers. The `sb`
  CLI mirrors these server-side with the service-role key.
- `src/app/page.tsx` — projects index; `src/app/p/[projectId]/page.tsx` — one board.
- `supabase/schema.sql` — full current schema for a FRESH project (projects + scenes +
  script + RLS + `scene-images` bucket). Image object paths stay
  `{user_id}/{scene_id}/{uuid}.{ext}` (no project segment — scene ids are unique, so
  images never move between projects); RLS scopes by the first path segment (`user_id`).
- `supabase/migrations/0001_multi_project.sql` — one-time upgrade of an EXISTING
  single-board DB to multi-project (adds the projects table + `project_id` columns and
  backfills the old board into a "My Storyboard" project). Run in the Supabase SQL
  editor, with a backup first; do not re-point existing images.
- No REST API routes — the web app talks to Supabase directly with the anon key
  under RLS; the CLI talks to it with the service-role key (bypasses RLS, owner-only).
