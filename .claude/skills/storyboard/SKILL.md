---
name: storyboard
description: Push workspaces, projects, scenes, social posts, merchandise items, games, music tracks, character sheets, prompts, media, and schedules into the cloud storyboard/pipeline app (the Supabase-backed board in this repo). Use whenever the user wants to add, update, reorder, or remove a storyboard scene, social post, merchandise item, game, track, or character; create/switch/rename/delete a workspace or move a project between workspaces; create/switch/rename/delete a project (storyboard, social, merchandise, game, music, or characters); set a generation prompt, post copy, or a character's visual DNA / profile / stage; attach reference images, a turnaround, a voice reference, or images/video/audio; set a post's schedule/status/platforms; research a product's supplier/cost/sale price/development time; get the read-only share link; animate a storyboard still into a video clip (local MiniMax H3 via ComfyUI); or read back the board. Also use after generating or downloading an image/video/audio the user wants saved as a scene, post, product shot, or character reference. E.g. "add this to the storyboard", "put this in Roaring Pines", "what's in Phantom Ranch", "new project for the tornado film", "schedule that post for Friday", "mark post 2 ready", "find me a manufacturer for this plushie and fill in the costs", "give me the share link", "animate scene 2", "make a character sheet for Lorenzo", "attach this voice reference to Bruno", "what's Echo's visual DNA", "mark Gomez approved".
---

# Storyboard + Social Pipeline

Push content into the cloud app via the `sb` CLI (`scripts/sb.mjs`). It writes
directly to the same Supabase backend the deployed web app reads from, so anything you
add appears in the browser instantly. Never tell the user to use the browser to do
something this CLI can do.

Content has exactly two levels: **workspaces** hold **projects**, and projects
hold scenes/posts/products/games/tracks/characters. A workspace is a folder with a name, not
a board — "Phantom Ranch" is one (it holds the five original projects); "Roaring
Pines" will be another. Nothing about a project changes when it moves between
workspaces: its `/p/{id}` URL, share link, and media all stay put.

Projects come in six kinds:
- **storyboard** — film boards: scenes with a prompt and one hero image, plus
  optional media clips alongside it (rendered by `animate` or attached with
  `--media`).
- **social** — post pipelines: posts with copy, multiple media (images/video),
  a schedule, a status (idea/draft/ready/scheduled/posted), and platforms.
  Nothing publishes from here; it's the planning/review surface.
- **merchandise** — product tracking. A product has images, a concept
  description, a sale price, a development time, and a stage
  (concept/sourcing/quotes/orders/ready). Underneath it sit **many suppliers**
  (each optionally carrying a quote) and **many orders**. Margin is derived
  from the cheapest quote against the sale price — never stored.

- **game** — playable games: screenshots, an optional short video, a summary, a
  play link, and a stage (prototype/in_development/playable/released).
- **music** — tracks headed for Spotify: cover art, the audio itself, a summary,
  a listen link, and a stage (demo/recorded/mixed/mastered/submitted/released).
- **character** — character sheets: one item per character, with reference
  images, an optional turnaround / short video, a voice-reference audio clip, a
  **Profile** (`--desc`), the **Visual DNA** prompt (`--prompt`), a reference
  link (`--link`), and a stage (concept/design/approved/locked). Same showcase
  surface as game and music.

## Games and music

Both use the same commands — media, a summary, and `--link` for where to play
or listen (characters share this surface too — see the next section):

```
npm run sb -- project add "Games" --kind game
npm run sb -- add --name "Echo Runner" --desc "Endless runner. Three biomes." \
  --link "https://itch.io/…" --status playable
npm run sb -- media 1 add ./screen1.png ./screen2.png ./trailer.mp4

npm run sb -- project add "Music" --kind music
npm run sb -- add --name "Guardian Theme" --desc "Main title cue, 2:14" \
  --link "https://open.spotify.com/track/…" --status mastered
npm run sb -- media 1 add ./cover.png ./guardian-theme.wav
```

- Audio uploads (mp3/wav/flac/m4a/aac/ogg) are classified automatically and get
  a player in the app and on the share page. Cover art is just an image on the
  same track.
- `--link` only applies to game, music, and character projects; it errors
  elsewhere.
- Stages differ per kind — `--status playable` is a game stage, `--status
  mastered` a music one, `--status approved` a character one; the CLI
  validates against the project's own kind.

## Characters

A character project is the cast bible — one item per character, on the same
showcase surface as games and music. Its fields map onto the ordinary flags:

- `--desc` is the **Profile**: role, personality, backstory, how they speak.
- `--prompt` is the **Visual DNA**: the generation/look prompt (species,
  build, outfit, colours, signature details) that keeps every render on-model.
- `--link` is the **Reference link**: voice model, design doc, turnaround.
- `--media` holds the reference images, an optional turnaround / short video,
  and the voice-reference audio clip (mp3/wav/… — it gets a player in the app).
- `--status` is the stage: `concept → design → approved → locked` (Concept /
  In design / Approved / Locked). New characters start at `concept`.

```
npm run sb -- project add "Cast" --kind character
npm run sb -- add --name "Lorenzo" --desc "Team medic; deadpan, warm" \
  --prompt "teen cream retriever, black beanie, headphones round neck, black medic vest with red cross, black cargo trousers, black sneakers" \
  --link "https://…" --status design \
  --media ./lorenzo-front.png --media ./lorenzo-voice.mp3
npm run sb -- media 1 add ./lorenzo-turnaround.mp4 ./lorenzo-side.png
npm run sb -- set 1 --status approved
```

Rules for this work:
- **The Visual DNA is locked text.** When generating any image or video of a
  character that has a sheet, paste its Visual DNA **verbatim** into the prompt
  — never paraphrase, trim, or "improve" it; a rewrite is how a design drifts
  off-model. Change it on the sheet (`set <n> --prompt "…"`) only when the user
  is deliberately changing the design, and then use the new text verbatim
  from that point on.
- `list` on a character project prints each character's stage, its image /
  video / audio counts, link, profile, and the **full Visual DNA** (untruncated,
  on its `visual DNA:` line). Copy the prompt from there verbatim rather than
  reconstructing the look from memory.
- The Visual DNA shows in the app's editor only; the public share page shows
  the profile, media, and link but never the prompt.
- Keep one character per item. Alternate outfits or ages belong in the
  profile and media of that character, not as a second item.

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

## Workspaces first, then projects

The CLI remembers a **current workspace** and a **current project** (in the
gitignored `.sb-state.json`). Project commands act within the current workspace;
scene/post commands act on the current project. Before adding/editing, make sure
you're in the right place — **pick the workspace first**: Roaring Pines content
never goes into Phantom Ranch, and vice versa.

- If the user names a workspace, `npm run sb -- workspace use "<name>"` first (or
  pass `--workspace "<name>"` on the command).
- If the user names a project, `npm run sb -- project use "<name>"` — that sets
  both the workspace and the project (or pass `--project "<name>"`).
- If you're unsure, run `npm run sb -- workspaces` and `npm run sb -- projects`
  and ask — don't guess. `projects --all` shows every workspace grouped, with
  "Workspace / Project" names.
- If the same project name exists in two workspaces, use a qualified ref
  (`"Phantom Ranch/Merchandise"`) or ask — never guess. The CLI errors on an
  ambiguous name and lists the qualified options; a name prefix never silently
  resolves into another workspace.
- Social content belongs in a `[social]` project; film scenes in a storyboard one;
  products, games, tracks, and characters in their own kinds.
- Commands print `Using project: <Workspace> / <Project>` to stderr; glance at it
  to confirm the target.

## How to use it

Always invoke through npm so args pass correctly (the `--` is required):

```
npm run sb -- <command> [args]
```

Workspace commands (`ws` is an alias for `workspace`):

| Goal | Command |
|------|---------|
| List workspaces (● = current, with project counts) | `npm run sb -- workspaces` (or `ws ls`) |
| Create a workspace + switch to it (clears the current project) | `npm run sb -- workspace add "Roaring Pines"` |
| Switch the current workspace | `npm run sb -- workspace use "Phantom Ranch"` |
| Rename a workspace | `npm run sb -- workspace rename 2 "New name"` |
| Delete an EMPTY workspace | `npm run sb -- workspace rm 2` (refused while it holds projects) |
| Move a project to another workspace | `npm run sb -- project move Merchandise "Roaring Pines"` (alias `mv`) |

Project commands (act within the current workspace):

| Goal | Command |
|------|---------|
| List this workspace's projects (● = current, `[kind]` tag, numbered 1..n) | `npm run sb -- projects` |
| List every workspace's projects, grouped | `npm run sb -- projects --all` |
| Create a storyboard + switch to it | `npm run sb -- project add "Tornado Film"` |
| Create a social pipeline + switch to it | `npm run sb -- project add "Q3 Social" --social` |
| Create another kind | `npm run sb -- project add "Merch" --merch` · `--kind game` · `--kind music` · `--kind character` |
| Create inside a different workspace | add `--workspace "Roaring Pines"` to `project add` |
| Switch the current project (sets the workspace too) | `npm run sb -- project use "Q3 Social"` |
| Rename a project | `npm run sb -- project rename 2 "New name"` |
| Delete a project (+ its scenes/media) | `npm run sb -- project rm 3` |

`project add` needs a workspace: the current one, `--workspace`, or the only one
if exactly one exists — otherwise it refuses and lists them. `project move`
appends the project to the end of the target workspace and never changes its
share link; if it was the current project it stays current.

Board/pipeline commands (act on the current project):

| Goal | Command |
|------|---------|
| Read the current board/pipeline | `npm run sb -- list` |
| Get the read-only share link | `npm run sb -- share` (`--regenerate` rotates it) |
| Read the script (storyboard) / notes (social) | `npm run sb -- script get` |
| Replace the script/notes | `npm run sb -- script set ./notes.md` |
| Act on a different project once | add `--project "<name>"` to any command |
| Act in a different workspace once | add `--workspace "<name>"` to any command that takes a project |

Storyboard scenes:

| Goal | Command |
|------|---------|
| Add a scene | `npm run sb -- add --name "Opening" --prompt "wide drone shot" --image ./shot.png` |
| Update prompt/name/desc | `npm run sb -- set 2 --prompt "tighter framing"` |
| Attach/replace the hero image | `npm run sb -- image 2 ./new.png` (path **or** http(s) URL) |
| Attach clips/extra frames alongside it | `npm run sb -- media 2 add ./clip.mp4` |
| Animate the still into a clip | `npm run sb -- animate 2 --duration 8` (see below) |
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

Refs:
- `<workspace>` is a 1-based index from `workspaces`, an exact name
  (case-insensitive), a full UUID, or a unique id prefix.
- `<project>` is a 1-based index from `projects`, an exact name, or a unique name
  prefix — resolved **within the current (or `--workspace`) workspace only**. A
  full UUID or unique id prefix is global, and so is a qualified
  `"Workspace/Project"` ref (either side may be a name or an index).
- `<scene>`/`<post>` is a 1-based index from `list`, a full UUID, or an id prefix.

## Animating scenes (image → video)

`animate <scene>` renders a storyboard scene's hero still into a video clip
with **MiniMax H3 image-to-video on the local ComfyUI** (Comfy Desktop must be
running with the H3 models installed; default `http://127.0.0.1:8000`, override
with `STORYBOARD_COMFY_URL`). The finished MP4 — with generated audio — is
attached to the scene as media automatically, so it shows on the board and the
share page.

```
npm run sb -- animate 2                          # scene still + scene prompt, 5s @ 0.7 MP
npm run sb -- animate 2 --prompt "slow push-in as she turns" --duration 8
npm run sb -- animate 2 --turbo                  # 8-step turbo LoRA (fast draft)
```

- The scene needs a still (`image_path`) — the clip's first frame. The motion
  prompt defaults to the scene's `prompt`; pass `--prompt` for a dedicated
  motion prompt (better: describe motion + camera + audio, not image style).
- Flags: `--duration` seconds (1–12, default 5), `--mp` megapixels (default
  0.7 — the value tier), `--turbo` (8 steps vs 20), `--seed`, `--steps`,
  `--timeout` minutes (default 30).
- It's slow by nature: **budget ~1 min of render per second of clip** at
  0.7 MP (less with `--turbo`). The command polls and reports progress; that's
  normal, don't kill it.
- Output aspect follows the still's aspect (fitted to the MP budget, multiples
  of 32).

## Working with media

`--image`, `--media`, and `media add` accept a **local file path or an http(s) URL**
(URLs are downloaded, then uploaded to Supabase Storage). When the user wants media you
just generated (e.g. via an image/video/audio-gen MCP) saved:
1. If you have a URL for it, pass the URL directly.
2. Otherwise download/save it locally first, then pass the path.

Notes: `--media` repeats for multiple items and works on **every kind** of
project, and takes images, video, and audio (mp3/wav/flac/m4a/aac/ogg) alike.
`--image` is storyboard-only — it sets the scene's single hero still,
and a storyboard scene can carry `--media` clips and extra frames alongside it
(the CLI errors helpfully if `--image` is used on another kind, or a video is
passed to `--image`). Every media item can be **downloaded from the app** as
the original file (a hover button on the thumbnail, a Download button in the
lightbox), and a storyboard scene's hero still has a Download button in the
scene editor; the public share page has no
download button, so point the user at the board itself when they want the
file. The browser's media picker accepts audio too (it used to drop audio
files silently, so audio could only be attached via this CLI — no longer).
Prefer **.mp4 (H.264)** for video; `.mov` often won't play
in Chrome. Supabase's default per-file cap is ~50MB. `--schedule` is local time
(`YYYY-MM-DD` or `YYYY-MM-DD HH:MM`); social statuses are
idea/draft/ready/scheduled/posted; platform aliases normalize (twitter→x,
ig→instagram, yt→youtube, fb→facebook).

## Recommended flow

1. Run `npm run sb -- list` first to see the board/pipeline and pick correct indexes
   (check the `Using project: <Workspace> / <Project>` line).
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

Errors about missing columns/tables mean the database is behind the code. Have the
user run the numbered migrations in `supabase/migrations/` **in order** in the
Supabase SQL editor (backup first) — each is additive and idempotent:
`0001_multi_project.sql`, `0002_social_pipeline.sql` (`kind`, `share_token`,
`scene_media`), `0003_merchandise.sql`, `0004_realtime_deletes.sql`,
`0005_merch_quotes_orders.sql`, `0006_games_music.sql`, `0007_workspaces.sql`
(`workspaces`, `projects.workspace_id`), `0008_realtime_publication.sql` (live
updates), `0009_workspace_required.sql` (`workspace_id` NOT NULL — only after
the app and CLI that send it are live), `0010_characters.sql` (the `character`
kind + the `design`/`approved`/`locked` stages). Errors naming `workspaces` or
`workspace_id` mean 0007 hasn't run; `kind`/`share_token`/`scene_media` mean
0002; a CHECK violation naming `character`, `design`, `approved`, or `locked`
means 0010.
