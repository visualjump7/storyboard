# Storyboard — notes for Claude

A single-user cloud app (Next.js 14 + Supabase). The user can have many
**projects**, and each project has a **kind**:

- `storyboard` — the original film board: scenes with name, description,
  generation **prompt**, and one **image**, plus a screenplay **script**.
- `social` — a **social-post pipeline**: posts with **copy** (the post text),
  multiple **media** (images and/or a video, ordered), a **schedule**
  date/time, a **status** (`idea → draft → ready → scheduled → posted`), and
  target **platforms**. The project's script row doubles as planning **Notes**
  (posting criteria, cadence, content pillars). Nothing publishes from here —
  posts are adapted and published with other tools later.

The browser app is just one client; the **source of truth is Supabase**
(Postgres `projects` + `scenes` + `scene_media` + `script`, private Storage
bucket `scene-images` — which holds videos too, despite the name). URLs: `/`
lists projects, `/p/{projectId}` is one board/pipeline, and `/share/{token}`
is a **public read-only review page** (unguessable per-project token, no
login) for sharing with the team.

## Pushing to the app (the `sb` CLI)

When the user wants to add/update projects, scenes, posts, prompts, media, or
schedules "in the storyboard/pipeline," use the agent CLI — do not tell them to
use the browser. It writes to the same Supabase backend the deployed app reads
from, so changes appear instantly.

Scene/post commands act on the **current project** (remembered in the
gitignored `.sb-state.json`). Always confirm which project you're operating on
— when in doubt, run `npm run sb -- projects` and ask the user, or pass
`--project`.

```
npm run sb -- projects                   # list projects (● = current, [social] tag)
npm run sb -- project add "Tornado Film" # create a storyboard project + make it current
npm run sb -- project add "Q3 Social" --social   # create a social pipeline
npm run sb -- project use "Q3 Social"    # switch the current project
npm run sb -- project rename 2 "New name"
npm run sb -- project rm 3               # deletes the project + all its scenes/media

npm run sb -- list                       # read the current board / pipeline
npm run sb -- share                      # print the read-only share link
npm run sb -- share --regenerate         # rotate the link (old one stops working)
npm run sb -- script get                 # script (storyboard) / notes (social)
npm run sb -- script set ./notes.md
```

Storyboard projects (unchanged):

```
npm run sb -- add --name "Opening" --prompt "wide drone shot at dawn" --image ./shot.png
npm run sb -- set 2 --prompt "tighter framing, golden hour"
npm run sb -- image 2 https://example.com/generated.png   # local path OR url
npm run sb -- rm 3
```

Social pipelines:

```
npm run sb -- add --name "Teaser" --copy "Launch day. Here's the story…" \
  --media ./a.png --media ./clip.mp4 --schedule "2026-08-20 09:30" \
  --platforms instagram,linkedin --status ready
npm run sb -- set 2 --copy "new text" --status scheduled
npm run sb -- set 2 --schedule none --platforms none     # clear either
npm run sb -- media 2                     # list a post's media
npm run sb -- media 2 add ./b.png https://example.com/c.jpg
npm run sb -- media 2 rm 1                # 1-based index from `media` list
npm run sb -- media 2 order 3,1,2         # full permutation
```

- `<project>` is an index from `projects`, a name, a full UUID, or an id prefix.
- `<scene>`/`<post>` is a **1-based index** from `list`, a full UUID, or an id prefix.
- Commands print `Using project: X` (to stderr) so you can confirm the target.
- `--project <project>` scopes a single command without changing the current one.
- `--image`/`--media` take a **local file path or an http(s) URL** (URLs are
  downloaded then uploaded). `--media` repeats for multiple items. Useful for
  piping in media you just generated (Higgsfield, Kling, etc.).
- `--schedule` is **local time**, `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`.
- `--status`: idea, draft, ready, scheduled, posted. Platform names normalize
  (twitter→x, ig→instagram, …); unknown slugs are stored with a warning.
- Videos: prefer **.mp4 (H.264)**; `.mov` often won't play in Chrome. Files over
  ~50MB hit Supabase's default per-file cap (raiseable in Storage → Settings).
- Social flags on a storyboard project (or `--image` on a social one) error
  with guidance — that's the kind gate working, not a bug.
- `add` places the scene/post at the end of the board (social: end of the
  **backlog**; scheduled posts display grouped by date in the app).

### Picking the right project

If the user names a project, `project use` it (or pass `--project`) before
acting. If they don't and more than one project exists, the CLI refuses scene
commands and lists them — surface that to the user and ask which one rather
than guessing. Social content belongs in `social` projects; film scenes in
`storyboard` projects.

### When `sb` reports it's not configured

It needs a gitignored `.env.local` on this machine (it is never pulled from
GitHub). Tell the user to create it from `.env.local.example`, specifically:
`SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API → service_role,
SECRET) and `STORYBOARD_OWNER_EMAIL`. The CLI prints these exact instructions
on failure. Optional: `STORYBOARD_APP_URL` makes `sb share` print full URLs.

### When the CLI suggests running a migration

Errors mentioning missing columns/tables (`kind`, `share_token`, `scene_media`,
…) mean the database predates the social pipeline: run
`supabase/migrations/0002_social_pipeline.sql` in the Supabase SQL editor
(backup first). It's additive and idempotent.

## App architecture (for reference)

- `src/lib/types.ts` — `Project` (with `kind`, `share_token`), `Scene` (post
  fields: `copy`, `status`, `scheduled_at`, `platforms`), `SceneMedia`,
  `ScriptRow`, `POST_STATUSES`, `SCENE_IMAGES_BUCKET`.
- `src/lib/projects.ts` — project CRUD (delete also clears image folders);
  `createProject` takes a `kind`.
- `src/lib/scenes.ts` / `script.ts` — original scene + script ops (untouched).
- `src/lib/posts.ts` / `media.ts` / `pipeline.ts` — post field updates,
  scene_media CRUD, and backlog/schedule grouping + date helpers.
- `src/lib/storage.ts` — upload + signed-URL helpers (images and video mimes).
  The `sb` CLI mirrors these server-side with the service-role key.
- `src/lib/supabase/admin.ts` + `src/lib/share.ts` — server-only service-role
  client + share-token data fetch, used ONLY by `/share/[token]` (the one
  place the service key runs in the deployed app; set it on Vercel).
- `src/app/p/[projectId]/page.tsx` — branches on `project.kind`:
  `Storyboard` (original, untouched) vs `PostPipeline`.
- Pipeline UI: `PostPipeline` (state owner) → `PipelineToolbar` (Add post,
  Notes, Share-link copy), `PipelineBoard` (draggable Backlog + date-grouped
  Scheduled), `PostCardView`, `PostDetail`/`PostEditor` (copy, platforms,
  status, schedule, collapsed generation prompt), `MediaStrip` (multi-upload,
  reorder, lightbox), `VideoThumb`, `PostBadges` (status/platform chips).
- `src/app/share/[token]/page.tsx` + `ShareView` — public read-only review
  (full copy, media carousels, playable video; noindex). `src/middleware.ts`
  exempts `/share/*` from auth.
- `supabase/schema.sql` — full current schema for a FRESH project.
  `supabase/migrations/0001_multi_project.sql` (single-board → projects) and
  `0002_social_pipeline.sql` (adds kind/share_token/post columns/scene_media)
  upgrade an EXISTING DB in order. Run in the SQL editor with a backup first.
- Image/video object paths stay `{user_id}/{scene_id}/{uuid}.{ext}` (no
  project segment — scene ids are unique). RLS scopes by the first path
  segment (`user_id`). Scene deletion sweeps the whole folder, which also
  removes post media.
- No REST API routes — the web app talks to Supabase directly with the anon
  key under RLS; the CLI and the share page use the service-role key.
