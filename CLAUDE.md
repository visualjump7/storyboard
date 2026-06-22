# Storyboard — notes for Claude

A single-user cloud storyboard app (Next.js 14 + Supabase). It plans video scenes:
each scene has a name, description, generation **prompt**, and an **image**. There is
also one screenplay **script** per user. The browser app is just one client; the
**source of truth is Supabase** (Postgres `scenes` + `script` tables, private Storage
bucket `scene-images`), so it's reachable from any machine.

## Pushing to the storyboard (the `sb` CLI)

When the user wants to add/update scenes, prompts, or images "in the storyboard,"
use the agent CLI — do not tell them to use the browser. It writes to the same
Supabase backend the deployed app reads from, so changes appear instantly.

```
npm run sb -- list                       # read the board back (touch base)
npm run sb -- add --name "Opening" --prompt "wide drone shot of a coastline at dawn" --image ./shot.png
npm run sb -- set 2 --prompt "tighter framing, golden hour"
npm run sb -- image 2 https://example.com/generated.png   # local path OR url
npm run sb -- rm 3
npm run sb -- script get
npm run sb -- script set ./script.md
```

- `<scene>` is a **1-based index** from `list`, a full UUID, or an id prefix.
- `--image` takes a **local file path or an http(s) URL** (URLs are downloaded then
  uploaded). Useful for piping in an image you just generated (Higgsfield, etc.) —
  save/download it locally or pass its URL.
- `add` places the scene at the end of the board.

### When `sb` reports it's not configured

It needs a gitignored `.env.local` on this machine (it is never pulled from GitHub).
Tell the user to create it from `.env.local.example`, specifically:
`SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API → service_role, SECRET)
and `STORYBOARD_OWNER_EMAIL`. The CLI prints these exact instructions on failure.

## App architecture (for reference)

- `src/lib/types.ts` — `Scene`, `ScriptRow` types and `SCENE_IMAGES_BUCKET`.
- `src/lib/storage.ts` — browser-side image upload + signed-URL helpers. The `sb`
  CLI mirrors this server-side with the service-role key.
- `supabase/schema.sql` — tables, RLS policies, and the `scene-images` bucket.
  Image object paths are `{user_id}/{scene_id}/{uuid}.{ext}`; RLS scopes access by
  the first path segment (`user_id`). The CLI writes to that same convention.
- No REST API routes — the web app talks to Supabase directly with the anon key
  under RLS; the CLI talks to it with the service-role key (bypasses RLS, owner-only).
