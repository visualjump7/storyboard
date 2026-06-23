---
name: storyboard
description: Push projects, scenes, prompts, and images into the cloud storyboard app (the Supabase-backed Next.js board in this repo). Use whenever the user wants to add, update, reorder, or remove a storyboard scene, create/switch/rename/delete a project (storyboard), set a generation prompt, attach or replace a scene image, or read back the current board — e.g. "add this to the storyboard", "new project for the tornado film", "switch to the X project", "put this shot in the board", "update scene 2's prompt", "what's on the storyboard". Also use after generating or downloading an image the user wants saved as a scene.
---

# Storyboard

Push content into the cloud storyboard via the `sb` CLI (`scripts/sb.mjs`). It writes
directly to the same Supabase backend the deployed web app reads from, so anything you
add appears in the browser instantly. Never tell the user to use the browser to do
something this CLI can do.

## Projects come first

The app has multiple **projects** (storyboards). Scene commands act on the **current
project** (remembered in the gitignored `.sb-state.json`). Before adding/editing
scenes, make sure you're on the right project:

- If the user names a project, `npm run sb -- project use "<name>"` first (or pass
  `--project "<name>"` on the command).
- If you're unsure which project, run `npm run sb -- projects` and ask — don't guess.
- Scene commands print `Using project: X` to stderr; glance at it to confirm the target.

## How to use it

Always invoke through npm so args pass correctly (the `--` is required):

```
npm run sb -- <command> [args]
```

Project commands:

| Goal | Command |
|------|---------|
| List projects (● = current) | `npm run sb -- projects` |
| Create a project + switch to it | `npm run sb -- project add "Tornado Film"` |
| Switch the current project | `npm run sb -- project use "Tornado Film"` |
| Rename a project | `npm run sb -- project rename 2 "New name"` |
| Delete a project (+ its scenes/images) | `npm run sb -- project rm 3` |

Scene commands (act on the current project):

| Goal | Command |
|------|---------|
| Read the current board | `npm run sb -- list` |
| Add a scene | `npm run sb -- add --name "Opening" --prompt "wide drone shot at dawn" --image ./shot.png` |
| Add a prompt-only scene | `npm run sb -- add --prompt "..."` |
| Update a scene's prompt/name/desc | `npm run sb -- set 2 --prompt "tighter framing"` |
| Attach/replace an image | `npm run sb -- image 2 ./new.png` (path **or** http(s) URL) |
| Delete a scene | `npm run sb -- rm 3` |
| Read the screenplay | `npm run sb -- script get` |
| Replace the screenplay | `npm run sb -- script set ./script.md` |
| Act on a different project once | add `--project "<name>"` to any scene command |

`<project>` is an index from `projects`, a name, a UUID, or an id prefix.
`<scene>` is a 1-based index from `list`, a full UUID, or an id prefix.

## Working with images

`--image` / the `image` command accept a **local file path or an http(s) URL** (a URL
is downloaded, then uploaded to Supabase Storage). So when the user wants an image you
just generated (e.g. via an image-gen MCP) saved as a scene:
1. If you have a URL for it, pass the URL directly.
2. Otherwise download/save it locally first, then pass the path.

## Recommended flow

1. Run `npm run sb -- list` first to see the board and pick correct scene indexes.
2. Make the change (`add` / `set` / `image` / `rm`).
3. Confirm what changed in plain language (e.g. "Added scene 4 with that prompt and image").

## If the CLI says it isn't configured

It needs a gitignored `.env.local` on this machine (never pulled from GitHub). Point the
user to `.env.local.example` and have them fill in `SUPABASE_SERVICE_ROLE_KEY`
(Supabase Dashboard → Project Settings → API → service_role — secret) and
`STORYBOARD_OWNER_EMAIL`. The CLI prints the exact lines needed on failure.
