# Storyboard (cloud)

A cloud, dark-themed planning app. Content sits in **workspaces** (one per
production — e.g. Phantom Ranch, Roaring Pines), each holding **projects**.
A project is one of six kinds: a **film storyboard** — a visual scene
organizer (think Adobe Bridge) with a script editor; a **social-post
pipeline** — posts with copy, multiple images/video, a posting schedule,
statuses, and target platforms; a **merchandise** board — products with
supplier quotes and orders; a **games** showcase; a **music** showcase; or a
**characters** sheet — reference images, a voice reference, and the visual-DNA
prompt that keeps every render on-model — each with a public read-only
**share link** for team review. Single user,
private behind one shared password, reachable from any computer via a deployed
URL. Nothing publishes to social networks from here; it's the planning and
review surface.

**Stack:** Next.js (App Router) + TypeScript · Tailwind CSS · Supabase
(Auth + Postgres + Storage) · @dnd-kit · `@supabase/ssr`.

## Image storage: signed URLs (the chosen approach)

The `scene-images` bucket is **private** (it holds videos and audio too,
despite the name). Media is displayed with short-lived **signed URLs** (1-hour
expiry, auto-refreshed in long sessions), and Storage RLS restricts every
object to its owner. A public bucket was deliberately *not* used — for an app
that is private to one owner, public objects would be readable by anyone with
the URL. `scenes.image_path` and `scene_media.path` store only the **object
path** (e.g. `{user_id}/{scene_id}/{uuid}.png`), never the bytes and never a
URL.

---

## 1. Run locally

```bash
npm install
cp .env.local.example .env.local   # then edit with your real values
npm run dev
```

Open http://localhost:3000. You need a Supabase project first — see below. The
required env vars (in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>   # secret; server-only
STORYBOARD_OWNER_EMAIL=<the owner account's email>
STORYBOARD_PASSWORD=<the shared login password>
```

The URL and both keys come from **Supabase Dashboard → Project Settings →
API**. The anon key is meant to be public; Row Level Security is what protects
data. The service-role key bypasses RLS and must never get a `NEXT_PUBLIC_`
prefix — the login gate and the `/share` page read it server-side only.

---

## 2. Supabase setup checklist

1. **Create a project** at https://supabase.com/dashboard (note the project ref).
2. **Run the schema.** Open **SQL Editor**, paste all of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `workspaces`, `projects`, `scenes`, `scene_media`, `script`, `merch_quotes`,
   and `merch_orders` tables, enables RLS with owner-only policies, and adds
   the Storage policies for the `scene-images` bucket.
3. **Storage bucket.** Running `schema.sql` (step 2) already creates the private
   **`scene-images`** bucket and its RLS policies. Confirm it exists under
   **Storage** with **Public OFF**. If your project blocked the SQL
   `insert into storage.buckets`, create it manually: **Storage → New bucket**,
   name **`scene-images`**, Public **OFF**.
4. **Create your owner account.** Go to **Authentication → Users → Add user**,
   enter your email, and enable "Auto Confirm User". This is the account every
   row belongs to; its Supabase password is never typed into the app (see
   Auth below), so it can be anything strong. Public sign-up is intentionally
   not exposed in the app. Leave email sign-ups disabled under
   **Authentication → Providers** if you want to be sure no one else can
   register.
5. **Set env vars.** Copy `Project URL`, `anon public`, and `service_role` from
   **Project Settings → API** into `.env.local` (local) and into Vercel
   (deploy), together with `STORYBOARD_OWNER_EMAIL` (the account from step 4)
   and `STORYBOARD_PASSWORD` (the one password the login screen accepts).

That's it — `npm run dev`, enter the shared password, and the workspace index
loads empty with an action to create your first workspace.

---

## 3. Deploy to Vercel

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. In Vercel, **New Project → Import** the repository. Framework preset is
   detected as **Next.js**; no build settings to change.
3. **Set environment variables** (Project → Settings → Environment Variables),
   for Production (and Preview if you want it):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — mark it **Sensitive**. Server-only; used by
     the login gate (to mint the owner's session) and by the public read-only
     `/share/{token}` page (to resolve share tokens and sign media URLs). Never
     expose it with a `NEXT_PUBLIC_` prefix.
   - `STORYBOARD_OWNER_EMAIL` — the owner account from the setup checklist.
   - `STORYBOARD_PASSWORD` — mark it **Sensitive**. Anyone with it gets full
     owner access.
4. **Deploy.** Your app is live at the Vercel URL. Enter the shared password.
   Data and media live in Supabase, so the same content is available from any
   computer.

No extra Supabase config is needed for the Vercel domain — the browser talks to
Supabase directly using the public URL + anon key, and auth cookies are managed
by `@supabase/ssr` middleware.

### Upgrading an existing database

Fresh projects get everything from `schema.sql`. An existing database upgrades
with the numbered migrations, run **in order** in the SQL editor (take a backup
first — Dashboard → Database → Backups). Each is additive and idempotent, and
the deployed app keeps working while they run:

1. `supabase/migrations/0001_multi_project.sql` — single board → projects.
2. `supabase/migrations/0002_social_pipeline.sql` — adds `projects.kind`,
   per-project `share_token`s, the post columns on `scenes`
   (`copy`/`status`/`scheduled_at`/`platforms`), and the `scene_media` table.
3. `supabase/migrations/0003_merchandise.sql` — the `merchandise` kind and its
   product fields (`sale_price`, `dev_time`).
4. `supabase/migrations/0004_realtime_deletes.sql` — `replica identity full` on
   `scenes` and `scene_media` so realtime delete events carry `project_id`.
5. `supabase/migrations/0005_merch_quotes_orders.sql` — `merch_quotes` and
   `merch_orders` (many suppliers/quotes and many orders per product).
6. `supabase/migrations/0006_games_music.sql` — the `game` and `music` kinds,
   `scenes.link_url`, their stages, and `audio` media.
7. `supabase/migrations/0007_workspaces.sql` — the `workspaces` table,
   `projects.workspace_id` + `projects.order_index`, and a backfill that files
   existing projects under a "Phantom Ranch" workspace. `workspace_id` is
   nullable here; 0009 makes it NOT NULL once every client sends it.
8. `supabase/migrations/0008_realtime_publication.sql` — adds the tables the
   app subscribes to (`scenes`, `scene_media`, `script`, `merch_quotes`,
   `merch_orders`) to the `supabase_realtime` publication. Without it no live
   update ever fires.
9. `supabase/migrations/0009_workspace_required.sql` — `projects.workspace_id`
   NOT NULL. Deploy the app and update the CLI first; it halts if any project
   is still unfiled instead of guessing where it belongs.
10. `supabase/migrations/0010_characters.sql` — the `character` kind and its
    stages (`design`, `approved`, `locked`; `concept` already existed, shared
    with merchandise). No new columns or tables.

Videos share the `scene-images` bucket. Supabase's default per-file upload cap
is 50MB — raise it under **Storage → Settings** if you need larger clips.

---

## Routes

- `/` — the **workspace index**: a card per workspace with its project count
  and kind chips; create, rename, and delete workspaces (delete is refused
  while a workspace still holds projects); an "Unfiled" list lets you file
  any project that has no workspace yet.
- `/w/{workspaceId}` — **one workspace's projects** (in `order_index`, then
  creation order): create a project inside it, rename, delete, or move a
  project to another workspace.
- `/p/{projectId}` — **one board/pipeline** (storyboard, social, merchandise,
  games, music, or characters by the project's kind). Unchanged by the workspace layer —
  every existing URL keeps working. The toolbar breadcrumb reads
  S › Workspace › Project, and the project switcher lists that workspace's
  other projects.
- `/share/{token}` — **public read-only review** of one project (unguessable
  per-project token, no login, `noindex`). There is no workspace-level share
  link.
- `/camera-references` — the private cinematic reference library (global, not
  tied to a workspace).

## Features

- **Camera References** — a private `/camera-references` page available from the
  projects header and film storyboard toolbar. Browse all 150 Cinematique
  catalog entries across seven categories using search, gallery/list views,
  technique filters, and browser-local saved references. The shot explorer
  shows original procedural camera/framing studies, with camera path and lens
  views, play/pause, scrubbing, speed controls, and synchronized two-shot
  comparisons. Copy a direction or customize its placeholders in a shot brief.
  Every non-camera entry now has a technique-specific, scrubbable study:
  lighting sources and shadows, composition guides, edit transitions,
  narrative beats, color/optical effects, and illustrative style excerpts.
  Fifteen camera entries also use human framing, focus, and action studies.
  Grading, desaturation, sepia, and grain support before/after views and a
  local JPEG/PNG/WebP reference image; the image is not uploaded or saved.
  Selecting a study starts playback unless reduced motion is requested.
  Diagrams are illustrative, not source footage or generation results; source
  attribution and original review states are retained. No model calls or new
  dependencies are required.

  The imported source is recorded in `src/lib/camera-reference/catalog-data.ts`.
  To refresh or check it, pass the supplied catalog to
  `node scripts/import-camera-references.mjs <path-to-catalog.json> [--check]`.
  With the app running locally, `node scripts/check-camera-references.cjs`
  checks the existing login and library interactions without writing scenes.
  Set `CAMERA_QA_PASSWORD` for the additional section-password check.
  It uses an already installed Playwright/Chrome runtime; `PLAYWRIGHT_MODULE`,
  `CHROME_PATH`, and `CAMERA_QA_URL` can override local paths and the test URL.
  `node scripts/check-visual-studies.cjs` exercises all 109 non-camera studies,
  sample camera studies, mobile layout, and actual desaturation pixel values.

  Camera References has an additional server-verified password gate. Successful
  entry grants an eight-hour, signed, user-bound HttpOnly cookie; **Lock section**
  clears it. The catalog is delivered only after both access checks, rather
  than included in a publicly readable JavaScript bundle. The configured
  fallback password is stored only as a salted scrypt hash. Set the optional
  server-only `CAMERA_REFERENCES_PASSWORD` to replace it. Cookies use
  `CAMERA_REFERENCES_SESSION_SECRET`, falling back to the existing server-only
  Supabase service key, so the existing deployment needs no additional setup.

- **Auth** — a single shared password gate. The `/login` screen takes one
  password (`STORYBOARD_PASSWORD`, compared in constant time); on a match the
  server uses the service-role key to mint a magic-link token for the owner
  account (`STORYBOARD_OWNER_EMAIL`) and redeems it immediately, so the
  browser ends up with an ordinary Supabase session and every RLS policy keeps
  working untouched. The owner's credentials never reach the browser.
  Unauthenticated users are redirected to `/login` by middleware (except
  `/share/*`); the session persists across refreshes; sign-out is in the
  toolbar.
- **Workspaces** — one level above projects. Ordered cards on `/`, each
  showing its project count and kind chips; deleting is refused until the
  workspace is empty, so no media can be orphaned.
- **Projects** — ordered within their workspace; a project can be moved to
  another workspace without changing its URL, share link, or stored media.
  The `sb` CLI (`scripts/sb.mjs`, see `CLAUDE.md`) mirrors all of this.
- **Characters** — a character-sheet kind on the same showcase surface as
  games and music (card grid + detail slide-over). Each character carries
  reference images, an optional turnaround video, a voice-reference audio
  clip, a Profile, a Reference link, a stage (Concept → In design → Approved →
  Locked), and a **Visual DNA** prompt — the generation prompt that keeps every
  render on-model, shown in the editor only and never on the share page.
- **Media download** — every media item on every kind has a hover Download
  button on its thumbnail and a Download button in the lightbox; a storyboard
  scene's hero still has its own Download button in the scene editor. Both
  serve the original file through a short-lived signed URL with an attachment
  disposition. The media picker accepts images, video, and audio; for audio
  the browser reports with no MIME type it falls back to the file extension
  (mp3/wav/flac/m4a/aac/ogg).
- **Grid** — scene cards wrap across the canvas; a toolbar **size slider** scales
  them Adobe-Bridge style (size remembered in `localStorage`). Each card shows
  the cover-fit thumbnail (or a clean placeholder), a `Scene N` badge, name, and
  a one-line description.
- **Drag to reorder** — `@dnd-kit` sortable; on drop, `order_index` is recomputed
  and persisted (batched), and badges always read 1, 2, 3… in visual order
  (numbers are derived from order, never stored).
- **Scene detail** — slide-over with click/drag image upload (shows a pending
  state), inline name, read-only derived number, Prompt + Description; Prev/Next
  and ←/→ keys step scenes, Esc closes; delete-with-confirm; Replace/Remove
  image. Text edits autosave (debounced ~400ms); image actions save immediately.
- **Script panel** — collapsible dock, autosaves to the `script` table, remembers
  open/closed state.
- **Loading / empty states** — a loading state while scenes fetch and a friendly
  empty state with "Add your first scene". No example data is auto-seeded.

## Data model

Exactly two levels of nesting: workspaces hold projects; projects hold scenes.

- `workspaces`: `id`, `user_id`, `name`, `description`, `order_index`,
  `created_at`, `updated_at`.
- `projects`: `id`, `user_id`, `workspace_id` (→ `workspaces`, `ON DELETE NO
  ACTION`), `order_index` (position within its workspace), `name`, `kind`
  (`storyboard` | `social` | `merchandise` | `game` | `music` | `character`),
  `share_token` (unguessable, backs `/share/{token}`), `created_at`,
  `updated_at`.
- `scenes` (one row per scene / post / product / game / track / character):
  `id`, `user_id`, `project_id`, `order_index`, `name`, `description`,
  `prompt` (the generation prompt; a character's Visual DNA), `image_path`
  (nullable; the storyboard hero still), post fields `copy`, `status`,
  `scheduled_at`, `platforms`, merchandise fields `sale_price`, `dev_time`,
  showcase `link_url` (game / music / character), `created_at`, `updated_at`.
  `status` is one shared column whose CHECK is the union of every kind's
  stages.
- `scene_media`: ordered images/videos/audio attached to a scene — `id`,
  `user_id`, `scene_id`, `kind` (`image` | `video` | `audio`), `path`,
  `position`, `created_at`.
- `script`: one row per project — `id`, `user_id`, `project_id`, `content`,
  `updated_at` (the screenplay on a storyboard, planning notes on a pipeline).
- `merch_quotes` / `merch_orders`: suppliers (with optional quotes) and orders
  under a merchandise product.
- RLS on every table: a user can only access rows where `user_id = auth.uid()`.
- Storage: objects under `scene-images/{user_id}/{scene_id}/...` — no
  workspace or project segment, so moving a project moves no files — owner-only
  via Storage RLS.

The single accent color (`#FF4800`) is defined once as the `--accent` CSS
variable in [`globals.css`](src/app/globals.css) and the `accent` token in
[`tailwind.config.ts`](tailwind.config.ts).
