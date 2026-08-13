---
name: storyboard
description: Push projects, scenes, social posts, merchandise items, prompts, media, and schedules into the cloud storyboard/pipeline app (the Supabase-backed Next.js board in this repo). Use whenever the user wants to add, update, reorder, or remove a storyboard scene, a social post, OR a merchandise item, create/switch/rename/delete a project (storyboard, social pipeline, or merchandise board), set a generation prompt or post copy, attach or replace scene images or post media (images/video), set a posting schedule/status/platforms, research and fill in a product's supplier/cost/sale price/development time, get the read-only share link, or read back the current board — e.g. "add this to the storyboard", "new project for the tornado film", "add this to the social pipeline", "schedule that post for Friday", "mark post 2 ready", "find me a manufacturer for this plushie and fill in the costs", "what would we sell this for", "what's in the pipeline", "give me the share link". Also use after generating or downloading an image/video the user wants saved as a scene, post, or product shot.
---

# Storyboard + Social Pipeline

Push content into the cloud app via the `sb` CLI (`scripts/sb.mjs`). It writes
directly to the same Supabase backend the deployed web app reads from, so anything you
add appears in the browser instantly. Never tell the user to use the browser to do
something this CLI can do.

Projects come in three kinds:
- **storyboard** — film boards: scenes with a prompt and one image.
- **social** — post pipelines: posts with copy, multiple media (images/video),
  a schedule, a status (idea/draft/ready/scheduled/posted), and platforms.
  Nothing publishes from here; it's the planning/review surface.
- **merchandise** — product tracking. A product has images, a concept
  description, a sale price, a development time, and a stage
  (concept/sourcing/quotes/orders/ready). Underneath it sit **many suppliers**
  (each optionally carrying a quote) and **many orders**. Margin is derived
  from the cheapest quote against the sale price — never stored.

## Merchandise: research is the job

The user typically uploads pictures first and leaves everything else blank,
then asks you to fill it in. That means: find real manufacturers, get real unit
costs, MOQs and lead times, propose a sale price, and write it all back.

```
npm run sb -- add --name "Luna Plushie" --desc "12in soft plush, embroidered eyes"
npm run sb -- quote 1 add --supplier "Shenzhen Plush Co" --contact "amy@…" \
  --url "https://…" --cost 8.40 --moq 250 --lead-time "5-7 weeks" \
  --notes "Minky fabric, PP cotton fill; sample $45"
npm run sb -- quote 1 add --supplier "Vietnam Toys Ltd" --cost 6.95 --moq 500
npm run sb -- set 1 --price 29.99 --dev-time "5-7 weeks" --status quotes
npm run sb -- order 1 add --supplier "Vietnam Toys Ltd" --qty 500 --cost 6.95 \
  --ordered 2026-08-13 --due 2026-10-10 --status in_production
```

Rules for this work:
- **Never invent a supplier, price, MOQ, or lead time.** Research it, and put
  where the figure came from in that supplier's `--notes`. If you can't find a
  real number, leave it empty and say so — an empty field reads as "unknown", a
  made-up one reads as researched.
- **Add several suppliers, not one.** The point of the board is comparison; a
  low unit cost often hides a high MOQ.
- A supplier with no `--cost` is a sourcing lead. Add the cost when you have a
  real quote — that is exactly the sourcing → quotes progression.
- Move the product's stage to match what you actually established. Don't set
  `orders` unless an order genuinely exists.
- `--cost none` / `--moq none` / `--price none` clear a value back to unknown.
- Products use `--media` for pictures, not `--image`.
- `npm run sb -- list` on a merchandise project prints every product with its
  quotes (q1, q2…) and orders (o1, o2…) — the numbers are what `quote 1 set 2`
  and `order 1 rm 1` refer to.

## Projects come first

Scene/post commands act on the **current project** (remembered in the gitignored
`.sb-state.json`). Before adding/editing, make sure you're on the right project:

- If the user names a project, `npm run sb -- project use "<name>"` first (or pass
  `--project "<name>"` on the command).
- If you're unsure which project, run `npm run sb -- projects` and ask — don't guess.
  Social content belongs in a `[social]` project; film scenes in a storyboard one.
- Commands print `Using project: X` to stderr; glance at it to confirm the target.

## How to use it

Always invoke through npm so args pass correctly (the `--` is required):

```
npm run sb -- <command> [args]
```

Project commands:

| Goal | Command |
|------|---------|
| List projects (● = current, `[social]` tag) | `npm run sb -- projects` |
| Create a storyboard + switch to it | `npm run sb -- project add "Tornado Film"` |
| Create a social pipeline + switch to it | `npm run sb -- project add "Q3 Social" --social` |
| Switch the current project | `npm run sb -- project use "Q3 Social"` |
| Rename a project | `npm run sb -- project rename 2 "New name"` |
| Delete a project (+ its scenes/media) | `npm run sb -- project rm 3` |

Board/pipeline commands (act on the current project):

| Goal | Command |
|------|---------|
| Read the current board/pipeline | `npm run sb -- list` |
| Get the read-only share link | `npm run sb -- share` (`--regenerate` rotates it) |
| Read the script (storyboard) / notes (social) | `npm run sb -- script get` |
| Replace the script/notes | `npm run sb -- script set ./notes.md` |
| Act on a different project once | add `--project "<name>"` to any command |

Storyboard scenes:

| Goal | Command |
|------|---------|
| Add a scene | `npm run sb -- add --name "Opening" --prompt "wide drone shot" --image ./shot.png` |
| Update prompt/name/desc | `npm run sb -- set 2 --prompt "tighter framing"` |
| Attach/replace the image | `npm run sb -- image 2 ./new.png` (path **or** http(s) URL) |
| Delete a scene | `npm run sb -- rm 3` |

Social posts:

| Goal | Command |
|------|---------|
| Add a post | `npm run sb -- add --name "Teaser" --copy "Launch day…" --media ./a.png --media ./b.mp4 --schedule "2026-08-20 09:30" --platforms instagram,linkedin --status ready` |
| Update copy/status/etc. | `npm run sb -- set 2 --copy "new text" --status scheduled` |
| Clear schedule/platforms | `npm run sb -- set 2 --schedule none --platforms none` |
| List a post's media | `npm run sb -- media 2` |
| Add media (repeatable) | `npm run sb -- media 2 add ./c.png https://…/d.jpg` |
| Remove / reorder media | `npm run sb -- media 2 rm 1` · `npm run sb -- media 2 order 3,1,2` |
| Delete a post | `npm run sb -- rm 3` |

`<project>` is an index from `projects`, a name, a UUID, or an id prefix.
`<scene>`/`<post>` is a 1-based index from `list`, a full UUID, or an id prefix.

## Working with media

`--image`, `--media`, and `media add` accept a **local file path or an http(s) URL**
(URLs are downloaded, then uploaded to Supabase Storage). When the user wants media you
just generated (e.g. via an image/video-gen MCP) saved:
1. If you have a URL for it, pass the URL directly.
2. Otherwise download/save it locally first, then pass the path.

Notes: `--media` repeats for multiple items and only works on social projects
(`--image` only on storyboards — the CLI errors helpfully if mixed up). Prefer
**.mp4 (H.264)** for video; `.mov` often won't play in Chrome. Supabase's default
per-file cap is ~50MB. `--schedule` is local time (`YYYY-MM-DD` or
`YYYY-MM-DD HH:MM`); statuses are idea/draft/ready/scheduled/posted; platform
aliases normalize (twitter→x, ig→instagram, yt→youtube, fb→facebook).

## Recommended flow

1. Run `npm run sb -- list` first to see the board/pipeline and pick correct indexes.
2. Make the change (`add` / `set` / `image` / `media` / `rm`).
3. Confirm what changed in plain language (e.g. "Added the teaser post with 2 images,
   scheduled Aug 20 at 9:30am for Instagram + LinkedIn").
4. For team review, offer the share link (`npm run sb -- share`).

## If the CLI says it isn't configured

It needs a gitignored `.env.local` on this machine (never pulled from GitHub). Point the
user to `.env.local.example` and have them fill in `SUPABASE_SERVICE_ROLE_KEY`
(Supabase Dashboard → Project Settings → API → service_role — secret) and
`STORYBOARD_OWNER_EMAIL`. The CLI prints the exact lines needed on failure.

## If the CLI suggests a migration

Errors about missing columns/tables (`kind`, `share_token`, `scene_media`, …) mean the
database predates the social pipeline. Have the user run
`supabase/migrations/0002_social_pipeline.sql` in the Supabase SQL editor (backup
first) — it's additive and idempotent.
