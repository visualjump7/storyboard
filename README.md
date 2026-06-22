# Storyboard (cloud)

A cloud, dark-themed app for planning video scenes — a visual scene organizer
(think Adobe Bridge) combined with a script editor. Single user, private behind
a login, reachable from any computer via a deployed URL. It is heavily
image-driven: scene images upload, replace, and delete fast, and everything
persists in the cloud.

**Stack:** Next.js (App Router) + TypeScript · Tailwind CSS · Supabase
(Auth + Postgres + Storage) · @dnd-kit · `@supabase/ssr`.

## Image storage: signed URLs (the chosen approach)

The `scene-images` bucket is **private**. Images are displayed with short-lived
**signed URLs** (1-hour expiry, auto-refreshed in long sessions), and Storage
RLS restricts every object to its owner. A public bucket was deliberately *not*
used — for an app that is private to one owner, public objects would be readable
by anyone with the URL. `scenes.image_path` stores only the **object path**
(e.g. `{user_id}/{scene_id}/{uuid}.png`), never the bytes and never a URL.

---

## 1. Run locally

```bash
npm install
cp .env.local.example .env.local   # then edit with your real values
npm run dev
```

Open http://localhost:3000. You need a Supabase project first — see below. The
two required env vars (in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both come from **Supabase Dashboard → Project Settings → API**. The anon key is
meant to be public; Row Level Security is what protects data.

---

## 2. Supabase setup checklist

1. **Create a project** at https://supabase.com/dashboard (note the project ref).
2. **Run the schema.** Open **SQL Editor**, paste all of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `scenes` and `script` tables, enables RLS with owner-only policies, and adds
   the Storage policies for the `scene-images` bucket.
3. **Storage bucket.** Running `schema.sql` (step 2) already creates the private
   **`scene-images`** bucket and its RLS policies. Confirm it exists under
   **Storage** with **Public OFF**. If your project blocked the SQL
   `insert into storage.buckets`, create it manually: **Storage → New bucket**,
   name **`scene-images`**, Public **OFF**.
4. **Create your owner account.** Go to **Authentication → Users → Add user**,
   enter your email + password, and enable "Auto Confirm User". (Public sign-up
   is intentionally not exposed in the app, so the URL stays private to you.
   Leave email sign-ups disabled under **Authentication → Providers** if you
   want to be sure no one else can register.)
5. **Set env vars.** Copy `Project URL` and `anon public` key from
   **Project Settings → API** into `.env.local` (local) and into Vercel (deploy).

That's it — `npm run dev`, sign in with the user you created, and the grid loads
empty with an "Add your first scene" action.

---

## 3. Deploy to Vercel

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. In Vercel, **New Project → Import** the repository. Framework preset is
   detected as **Next.js**; no build settings to change.
3. **Set environment variables** (Project → Settings → Environment Variables),
   for Production (and Preview if you want it):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy.** Your app is live at the Vercel URL. Sign in with your owner
   account. Data and images live in Supabase, so the same content is available
   from any computer.

No extra Supabase config is needed for the Vercel domain — the browser talks to
Supabase directly using the public URL + anon key, and auth cookies are managed
by `@supabase/ssr` middleware.

---

## Features

- **Auth** — email/password login; unauthenticated users are redirected to
  `/login` by middleware; session persists across refreshes; sign-out in the
  toolbar.
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

- `scenes`: `id`, `user_id`, `order_index`, `name`, `description`, `prompt`,
  `image_path` (nullable), `created_at`, `updated_at`.
- `script`: `id`, `user_id`, `content`, `updated_at` (one row per user).
- RLS on both tables: a user can only access rows where `user_id = auth.uid()`.
- Storage: objects under `scene-images/{user_id}/{scene_id}/...`, owner-only via
  Storage RLS.

The single accent color (`#FF4800`) is defined once as the `--accent` CSS
variable in [`globals.css`](src/app/globals.css) and the `accent` token in
[`tailwind.config.ts`](tailwind.config.ts).
