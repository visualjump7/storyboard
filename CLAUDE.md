# Storyboard — notes for Claude

A single-user cloud app (Next.js 14 + Supabase). Content is organised in
exactly two levels: **workspaces** hold **projects**, and projects hold
**scenes** (or posts / products / games / tracks / characters, depending on the
project's kind). A workspace is a folder, not a board — it has a name, a
description, and a position, nothing else, and it is *not* a project kind. Today
"Phantom Ranch" is one workspace holding all of that show's projects; "Roaring
Pines" will be another.

**Workspaces organise; they do not restrict.** The site has one shared password
that signs everyone in as the single owner, so anyone who can log in sees every
workspace. What a workspace buys is that a Roaring Pines board never lists
Phantom Ranch projects (and vice versa) in its switcher, its home page, or the
CLI's scoped resolution. The only *enforced* boundary for outsiders remains the
per-project `/share/{token}` link.

Each project has a **kind** (six of them):

- `storyboard` — the original film board: scenes with name, description,
  generation **prompt**, one hero **image** (plus optional media clips
  alongside it), and a screenplay **script**.
- `social` — a **social-post pipeline**: posts with **copy** (the post text),
  multiple **media** (images and/or a video, ordered), a **schedule**
  date/time, a **status** (`idea → draft → ready → scheduled → posted`), and
  target **platforms**. The project's script row doubles as planning **Notes**
  (posting criteria, cadence, content pillars). Nothing publishes from here —
  posts are adapted and published with other tools later.
- `merchandise` — a product-tracking board: products with images, a concept
  description, a sale price, a development time, and a stage
  (`concept → sourcing → quotes → orders → ready`); under each product sit
  many supplier quotes and many orders.
- `game` — playable games: screenshots, an optional short video, a summary, a
  play link, and a stage (`prototype → in_development → playable → released`).
- `music` — tracks headed for Spotify: cover art, the audio itself, a summary,
  a listen link, and a stage
  (`demo → recorded → mixed → mastered → submitted → released`).
- `character` — a **character sheet**: one row per character, with reference
  **images**, an optional turnaround / short **video**, a voice-reference
  **audio** clip, a **Profile** (`description`: role, personality, backstory,
  how they speak), the **Visual DNA** (`prompt`: the generation/look prompt
  that keeps every render on-model — shown in the editor for this kind only,
  never on the public share page), a **Reference link** (`link_url`: voice
  model, design doc, turnaround), and a stage
  (`concept → design → approved → locked`, labelled Concept / In design /
  Approved / Locked). No new columns: it reuses the same showcase surface as
  `game` and `music`.

Every media item on every kind can be **downloaded from the app** as the
original file: a hover button on its thumbnail in the media strip, and a
Download button in the lightbox. A storyboard scene's hero still downloads from
the Download button beside Replace / Remove in the scene editor. Both use a
short-lived signed URL with an attachment disposition. The public share page
has no download button.

The browser app is just one client; the **source of truth is Supabase**
(Postgres `workspaces` + `projects` + `scenes` + `scene_media` + `script` +
`merch_quotes` + `merch_orders`, private Storage bucket `scene-images` — which
holds videos and audio too, despite the name). URLs: `/` is the **workspace
index**, `/w/{workspaceId}` is **one workspace's projects**, `/p/{projectId}`
is one board/pipeline (unchanged), and `/share/{token}` is a **public
read-only review page** (unguessable per-project token, no login) for sharing
with the team. There is no workspace-level share link. Camera References stays
global at `/camera-references`.

## Pushing to the app (the `sb` CLI)

When the user wants to add/update workspaces, projects, scenes, posts, prompts,
media, or schedules "in the storyboard/pipeline," use the agent CLI — do not
tell them to use the browser. It writes to the same Supabase backend the
deployed app reads from. Board contents update live (`scenes`, `scene_media`,
`script`, and the merch tables are in the realtime publication — see 0008), but
the workspace index and project lists do not: `projects` and `workspaces` are
not published, so after `workspace add` or `project move` the user reloads to
see the change.

The CLI remembers a **current workspace** and a **current project** (both in
the gitignored `.sb-state.json`: `{ workspaceId, projectId }`; an old file
holding only `projectId` derives the workspace from that project on first use
and rewrites itself). Project commands act within the current workspace;
scene/post commands act on the current project. Always confirm both — when in
doubt, run `npm run sb -- workspaces` and `npm run sb -- projects` and ask the
user, or pass `--workspace` / `--project`.

Workspaces:

```
npm run sb -- workspaces                        # list workspaces (● = current) with project counts, numbered 1..n
npm run sb -- workspace add "Roaring Pines"     # create; becomes current; clears the current project
npm run sb -- workspace use "Phantom Ranch"     # switch; drops the current project if it isn't in here
npm run sb -- workspace rename 2 "New name"
npm run sb -- workspace rm 2                    # REFUSED while it still holds projects (move/delete them first)
npm run sb -- project move Merchandise "Roaring Pines"   # re-file a project (alias: mv)
```

`ws` is an alias for `workspace` (`sb ws ls` = `sb workspaces`). `project move`
appends the project to the end of the target workspace and never touches its
share token; if the moved project was current it stays current and the current
workspace follows it.

Projects (within the current workspace):

```
npm run sb -- projects                   # the current workspace's projects, numbered 1..n (header names the workspace)
npm run sb -- projects --all             # every workspace, grouped, as "Workspace / Project" — no bare numbers
npm run sb -- project add "Tornado Film"          # storyboard project inside the current workspace + make it current
npm run sb -- project add "Q3 Social" --social    # social pipeline (also --merch, or --kind game|music|…)
npm run sb -- project add "Games" --kind game --workspace "Roaring Pines"   # create in another workspace
npm run sb -- project use "Q3 Social"    # sets BOTH current workspace and project; prints "Current: <Workspace> / <Project>"
npm run sb -- project rename 2 "New name"
npm run sb -- project rm 3               # deletes the project + all its scenes/media

npm run sb -- list                       # read the current board / pipeline
npm run sb -- share                      # print the read-only share link
npm run sb -- share --regenerate         # rotate the link (old one stops working)
npm run sb -- script get                 # script (storyboard) / notes (social)
npm run sb -- script set ./notes.md
```

- `--kind` is `storyboard` (default), `social`, `merchandise`, `game`, `music`,
  or `character` (`characters` is accepted as an alias); `--social` and
  `--merch` are shorthands.
- `project add` needs a workspace: the current one, `--workspace`, or — if
  exactly one workspace exists — that one. Otherwise it refuses and lists the
  workspaces.
- With no current workspace, `projects` behaves like `--all` and hints to run
  `sb workspace use`.

Storyboard projects (unchanged):

```
npm run sb -- add --name "Opening" --prompt "wide drone shot at dawn" --image ./shot.png
npm run sb -- set 2 --prompt "tighter framing, golden hour"
npm run sb -- image 2 https://example.com/generated.png   # local path OR url
npm run sb -- rm 3
npm run sb -- animate 2 --duration 8              # still → video clip (local H3)
```

`animate` renders the scene's hero still into a video clip (with generated
audio) using **MiniMax H3 image-to-video on the local ComfyUI** and attaches
the MP4 to the scene as media. Comfy Desktop must be running with the H3
models (default `http://127.0.0.1:8000`; override `STORYBOARD_COMFY_URL` in
`.env.local`). The motion prompt defaults to the scene's `prompt` — pass
`--prompt` for a dedicated motion prompt. Flags: `--duration` s (1–12, default
5), `--mp` (default 0.7), `--turbo` (8-step LoRA draft mode vs 20 steps),
`--seed`, `--steps`, `--timeout` min (default 30). It legitimately takes
~1 min of render per second of clip at 0.7 MP — the command polls and prints
progress until done.

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

Merchandise, games, music, and characters (see
`.claude/skills/storyboard/SKILL.md` for the research rules and the
character rules):

```
npm run sb -- add --name "Luna Plushie" --desc "12in soft plush" --media ./front.png
npm run sb -- quote 1 add --supplier "Shenzhen Plush Co" --cost 8.40 --moq 250 --lead-time "5-7 weeks"
npm run sb -- order 1 add --supplier "Shenzhen Plush Co" --qty 500 --cost 8.40 --status placed
npm run sb -- set 1 --price 29.99 --dev-time "5-7 weeks" --status quotes
npm run sb -- add --name "Echo Runner" --desc "Endless runner" --link "https://itch.io/…" --status playable

npm run sb -- project add "Cast" --kind character
npm run sb -- add --name "Lorenzo" --desc "Team medic; deadpan, warm" \
  --prompt "teen cream retriever, black beanie, headphones round neck, black medic vest with red cross, black cargo trousers, black sneakers" \
  --link "https://…" --status design --media ./lorenzo-front.png --media ./lorenzo-voice.mp3
```

On a character, `--desc` is the Profile, `--prompt` is the Visual DNA, and
`--link` is the reference link; new characters default to `concept`. `sb list`
on a character project prints each character's stage and its image / video /
audio counts (like music), plus the full, untruncated Visual DNA — copy it from
there verbatim.

- `<workspace>` is a 1-based index from `workspaces`, an exact name
  (case-insensitive), a full UUID, or a unique id prefix. A purely numeric
  ref of 1–3 digits is always an index, never an id prefix (so `--project 9`
  can't land on a project whose UUID happens to start with 9); id prefixes
  need 4+ characters.
- `<project>` is a 1-based index from `projects`, an exact name, or a unique
  name prefix — all resolved **within the current (or `--workspace`) workspace
  only**. A full UUID or unique id prefix is global. A qualified
  `"Workspace/Project"` ref (slash-separated; either side a name or index) is
  global too. A name that matches in more than one workspace errors and lists
  the qualified names; a name prefix never silently resolves into another
  workspace.
- `<scene>`/`<post>` is a **1-based index** from `list`, a full UUID, or an id prefix.
- Commands print `Using project: <Workspace> / <Project>` (to stderr) so you
  can confirm the target; every status line names the project the same
  qualified way.
- `--project <project>` and `--workspace <workspace>` scope a single command
  without changing the saved state. `--workspace` is accepted by every command
  that resolves a project.
- When no `--project` is given and the saved project isn't in the current
  workspace, the CLI uses the workspace's only project if it has exactly one;
  otherwise it refuses and prints that workspace's numbered list.
- `--image`/`--media` take a **local file path or an http(s) URL** (URLs are
  downloaded then uploaded). `--media` repeats for multiple items and works on
  every kind; storyboard scenes keep their single hero still in `--image` and
  can carry `--media` clips alongside it. `--media` accepts images, video, and
  audio (mp3/wav/flac/m4a/aac/ogg — voice references, tracks). Useful for
  piping in media you just generated (Higgsfield, Kling, etc.).
- `--schedule` is **local time**, `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`.
- `--status` is validated against the project's kind: social idea, draft,
  ready, scheduled, posted; merchandise concept, sourcing, quotes, orders,
  ready; game prototype, in_development, playable, released; music demo,
  recorded, mixed, mastered, submitted, released; character concept, design,
  approved, locked. Platform names normalize (twitter→x, ig→instagram, …);
  unknown slugs are stored with a warning.
- Videos: prefer **.mp4 (H.264)**; `.mov` often won't play in Chrome. Files over
  ~50MB hit Supabase's default per-file cap (raiseable in Storage → Settings).
- Kind-specific flags on the wrong kind (`--copy` on a storyboard, `--image` on
  a social project, `--link` outside game/music/character) error with
  guidance — that's the kind gate working, not a bug.
- `add` places the scene/post at the end of the board (social: end of the
  **backlog**; scheduled posts display grouped by date in the app).

### Picking the right workspace and project

Pick the **workspace first**: Roaring Pines content never goes into Phantom
Ranch, and vice versa. If the user names a workspace, `workspace use` it (or
pass `--workspace`). If the user names a project, `project use` it (or pass
`--project`) — that sets both. If they name neither and the current workspace
holds more than one project, the CLI refuses scene commands and prints that
workspace's numbered list — surface that to the user and ask which one rather
than guessing. If the same project name exists in two workspaces, use a
qualified ref (`"Phantom Ranch/Merchandise"`) or ask — never guess. Social
content belongs in `social` projects; film scenes in `storyboard` projects;
products, games, tracks, and characters in their own kinds.

### When `sb` reports it's not configured

It needs a gitignored `.env.local` on this machine (it is never pulled from
GitHub). Tell the user to create it from `.env.local.example`, specifically:
`SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API → service_role,
SECRET) and `STORYBOARD_OWNER_EMAIL`. The CLI prints these exact instructions
on failure. Optional: `STORYBOARD_APP_URL` makes `sb share` print full URLs.

### When the CLI suggests running a migration

Errors mentioning missing columns/tables mean the database is behind the code.
Migrations live in `supabase/migrations/` and run **in order** in the Supabase
SQL editor (backup first); each is additive and idempotent:

1. `0001_multi_project.sql` — single board → projects
2. `0002_social_pipeline.sql` — `kind`, `share_token`, post columns, `scene_media`
3. `0003_merchandise.sql` — merchandise kind + product fields
4. `0004_realtime_deletes.sql` — replica identity full for realtime deletes
5. `0005_merch_quotes_orders.sql` — `merch_quotes` + `merch_orders`
6. `0006_games_music.sql` — game/music kinds, `link_url`, audio media
7. `0007_workspaces.sql` — `workspaces` table, `projects.workspace_id` + `order_index`,
   backfill of the existing projects into "Phantom Ranch" (`workspace_id` nullable here)
8. `0008_realtime_publication.sql` — adds `scenes`, `scene_media`, `script`,
   `merch_quotes`, `merch_orders` to the `supabase_realtime` publication (it was
   empty, so no live update had ever fired)
9. `0009_workspace_required.sql` — `projects.workspace_id` NOT NULL. Run ONLY
   after the web build and CLI that always send it are live; it halts loudly if
   any project is still unfiled rather than guessing a workspace for it.
10. `0010_characters.sql` — the `character` kind; `scenes.status` gains
    `design`, `approved`, `locked` (`concept` was already there, shared with
    merchandise)

Errors about `kind`, `share_token`, or `scene_media` point at 0002; errors
about `workspaces` or `workspace_id` point at 0007; a CHECK violation naming
`character`, `design`, `approved`, or `locked` points at 0010.

## App architecture (for reference)

- `src/lib/types.ts` — `Workspace`, `Project` (with `kind`, `workspace_id`
  — `string | null` until a later migration makes it NOT NULL — `order_index`,
  `share_token`), `Scene` (post fields: `copy`, `status`, `scheduled_at`,
  `platforms`; `link_url` for game/music/character; `sale_price`/`dev_time`
  for merchandise; a character's Visual DNA is the ordinary `prompt`),
  `SceneMedia`, `ScriptRow`, `KIND_LABELS`, `POST_STATUSES` and the
  merch/game/music/character status lists, `SHOWCASE_META` (per-kind labels,
  placeholders, and stages for the showcase surface — `promptLabel` is set
  only for `character`), `SCENE_IMAGES_BUCKET`.
- `src/lib/workspaces.ts` — `fetchWorkspaces` / `fetchWorkspace` /
  `createWorkspace` / `renameWorkspace` / `countWorkspaceProjects` /
  `deleteWorkspace` (refuses while the workspace still holds projects).
- `src/lib/projects.ts` — project CRUD scoped to a workspace:
  `fetchProjects(supabase, { workspaceId })`, `createProject(supabase, userId,
  workspaceId, name, kind)` (workspaceId required; `order_index` = count in
  that workspace), `moveProject(supabase, id, workspaceId)` (appends; never
  touches `share_token`), `persistProjectOrder`; delete also clears image
  folders.
- `src/lib/scenes.ts` / `script.ts` — original scene + script ops (untouched).
- `src/lib/posts.ts` / `media.ts` / `pipeline.ts` — post field updates,
  scene_media CRUD, and backlog/schedule grouping + date helpers.
- `src/lib/storage.ts` — upload + signed-URL helpers (image, video, and audio
  mimes); `signImageDownloadUrl` mints a short-lived signed URL with an
  attachment disposition for the in-app Download buttons. The `sb` CLI
  mirrors these server-side with the service-role key.
- `src/lib/supabase/admin.ts` — server-only service-role client. It runs in
  exactly two places in the deployed app: `src/lib/share.ts` (share-token data
  fetch for `/share/[token]`) and `src/app/login/actions.ts` (the shared
  password gate mints the owner's session via a magic-link token). Set
  `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
- Routes: `src/app/page.tsx` → `WorkspacesHome` (a card per workspace with
  project count + kind chips; New/Rename/Delete workspace; an "Unfiled" list
  with a "File under…" select for projects whose `workspace_id` is null).
  `src/app/w/[workspaceId]/page.tsx` → `ProjectsHome` scoped to one workspace
  (New project asks for a name, then creates inside it; each card has Move to…
  another workspace / Rename / Delete). `src/app/p/[projectId]/page.tsx` branches on
  `project.kind`: `Storyboard` (original, untouched), `PostPipeline`,
  `MerchCatalog`, `ShowcaseCatalog` (game + music + character; its
  `ShowcaseDetail` renders the Visual DNA prompt field only when the kind's
  `SHOWCASE_META` has a `promptLabel`, i.e. for character). Board toolbars show a
  breadcrumb S › Workspace › Project; `ProjectSwitcher` lists ONLY siblings in
  the same workspace, plus "New project in <Workspace>", "All <Workspace>
  projects" (→ `/w/{id}`), a "Switch workspace" section linking to each other
  workspace's `/w/{id}` (workspace names only — never their projects), and
  "All workspaces" (→ `/`).
- Pipeline UI: `PostPipeline` (state owner) → `PipelineToolbar` (Add post,
  Notes, Share-link copy), `PipelineBoard` (draggable Backlog + date-grouped
  Scheduled), `PostCardView`, `PostDetail`/`PostEditor` (copy, platforms,
  status, schedule, collapsed generation prompt), `MediaStrip` (multi-upload
  of images / video / audio — the picker used to accept only image/ and video/
  MIME types, so it silently dropped every audio file; it now accepts audio/
  too and falls back to the extension (mp3/wav/flac/m4a/aac/ogg) for audio the
  browser reports with no MIME type — reorder, lightbox, and a per-item
  Download of the original on the thumbnail hover and in the lightbox, with an
  inline error if signing fails; shared by every kind that has media),
  `VideoThumb`, `PostBadges` (status/platform chips). `PostCardView` picks
  the first image or video as a post's cover, never an audio item.
- `src/components/Dialog.tsx` — `useDialog()`, the in-app prompt / confirm used
  for every create-name, rename, move, and delete confirmation. Never use
  `window.prompt` / `window.confirm`: embedded browsers (the desktop app's
  preview pane) throw "prompt() is not supported", which once made Rename and
  New workspace silently do nothing. The dialog portals to `<body>`.
- `src/app/share/[token]/page.tsx` + `ShareView` — public read-only review
  (full copy, media carousels, playable video, and audio players — audio never
  enters a carousel; noindex). `src/middleware.ts`
  exempts `/share/*` from auth.
- `supabase/schema.sql` — full current schema for a FRESH project.
  `supabase/migrations/0001` … `0010` upgrade an EXISTING DB in order (list
  above). Run in the SQL editor with a backup first. `projects.workspace_id`
  is nullable in 0007 and is tightened to NOT NULL by 0009 once every client
  sends it. The FK is ON DELETE NO ACTION: deleting a workspace
  is refused while it holds projects (a cascade would orphan Storage objects,
  which Postgres never deletes).
- Image/video/audio object paths stay `{user_id}/{scene_id}/{uuid}.{ext}` (no
  workspace or project segment — scene ids are unique), so moving a project
  between workspaces moves no files. RLS scopes by the first path segment
  (`user_id`). Scene deletion sweeps the whole folder, which also removes post
  media.
- No REST API routes — the web app talks to Supabase directly with the anon
  key under RLS; the CLI, the share page, and the login gate use the
  service-role key.
