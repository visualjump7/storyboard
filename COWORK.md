# Driving the storyboard from Cowork

This lets Claude (in Cowork) create and edit scenes/script directly in your
Supabase project. Changes show up live in the app via Supabase Realtime — no
page refresh.

It uses a **direct service-key path**: a small script calls SQL helper
functions over HTTPS with the project's service-role key. It does **not** use
the Supabase MCP connector (which is scoped to a different org) and requires no
deployed middleware.

## One-time setup

1. **Create the helper functions + enable Realtime.**
   Paste [`supabase/cowork.sql`](supabase/cowork.sql) into the Supabase SQL
   editor and run it. (Safe to re-run.) This creates `cowork_create_scene`,
   `cowork_update_scene`, `cowork_delete_scene`, `cowork_reorder_scenes`,
   `cowork_set_script`, `cowork_list_scenes`, and adds `scenes`/`script` to the
   Realtime publication.

2. **Add your service-role key locally.**
   Copy `.env.cowork.local.example` → `.env.cowork.local` and paste your
   **service-role** key (Supabase → Settings → API Keys → *Legacy anon,
   service_role API keys* → `service_role`; a new `sb_secret_…` key works too).
   `.env.cowork.local` is gitignored and not loaded by Next.js, so the secret
   never reaches the browser or git.

3. **Verify:**
   ```bash
   node scripts/cowork.mjs check
   ```

## How Claude uses it

```bash
node scripts/cowork.mjs list

# create one or many (JSON on stdin)
node scripts/cowork.mjs create <<'JSON'
[
  { "name": "Cold open", "description": "Drone over the city at dawn.", "prompt": "Wide cinematic aerial, 35mm." },
  { "name": "The warehouse", "description": "Mara sets the case down.", "prompt": "Dim noir interior, single bulb." }
]
JSON

# edit a scene (only the fields you pass change)
echo '{ "id": "<scene-id>", "prompt": "New prompt text" }' | node scripts/cowork.mjs update

node scripts/cowork.mjs delete <scene-id>

echo '["<id3>","<id1>","<id2>"]' | node scripts/cowork.mjs reorder

node scripts/cowork.mjs set-script < my-script.txt
```

## Security notes

- The **service-role key bypasses Row Level Security** and has full database
  access. It lives only in `.env.cowork.local` (gitignored) and is used only by
  `scripts/cowork.mjs`. Never put it in `NEXT_PUBLIC_*`, commit it, or paste it
  into a deployed client.
- The SQL helpers are `SECURITY DEFINER` and granted only to `authenticated` +
  `service_role` (never `anon`), and there is no public sign-up, so only you /
  this service path can call them.
- Image handling is intentionally out of scope here (text scenes + script
  only). Deleting a scene via `cowork_delete_scene` does not remove its Storage
  image — delete scenes that have an uploaded image from the app UI, which
  cleans up Storage.
