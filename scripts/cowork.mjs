#!/usr/bin/env node
// ============================================================================
// Cowork → Storyboard writer.
//
// Calls the cowork_* RPC functions on Supabase using the project's SERVICE-ROLE
// key, so scenes/script can be created or edited directly from this machine
// (no Supabase MCP connector, no deployed middleware). Changes appear live in
// the app via Realtime.
//
// Credentials are read from .env.cowork.local (gitignored — never committed).
//
// Usage:
//   node scripts/cowork.mjs check                       # verify connectivity
//   node scripts/cowork.mjs list                        # list scenes
//   echo '<json>' | node scripts/cowork.mjs create      # {..} or [{..},..] of {name,description,prompt}
//   echo '<json>' | node scripts/cowork.mjs update      # {id, name?, description?, prompt?}
//   node scripts/cowork.mjs delete <sceneId>
//   echo '["id1","id2"]' | node scripts/cowork.mjs reorder
//   node scripts/cowork.mjs set-script < script.txt     # raw text on stdin
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function die(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

function usage() {
  console.log('Usage: check | list | create | update | delete <id> | reorder | set-script');
}

function loadEnv() {
  const path = resolve(ROOT, '.env.cowork.local');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    die(`Missing ${path}. Copy .env.cowork.local.example to .env.cowork.local and fill it in.`);
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';
  if (!url) die('SUPABASE_URL not set in .env.cowork.local');
  if (!key) die('SUPABASE_SERVICE_ROLE_KEY not set in .env.cowork.local');
  return { url, key };
}

async function rpc(env, fn, body) {
  const res = await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  if (!res.ok) die(`${fn} failed (HTTP ${res.status}): ${text}`);
  if (!text) return null;
  return JSON.parse(text);
}

const first = (r) => (Array.isArray(r) ? r[0] : r);
const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd || cmd === 'help' || cmd === '--help') {
  usage();
  process.exit(cmd ? 0 : 1);
}

const env = loadEnv();

switch (cmd) {
  case 'check': {
    const rows = await rpc(env, 'cowork_list_scenes', {});
    console.log(`OK — connected to ${env.url}. ${rows.length} scene(s).`);
    break;
  }
  case 'list': {
    const rows = await rpc(env, 'cowork_list_scenes', {});
    rows.forEach((s, i) =>
      console.log(`${String(i + 1).padStart(2)}. [${s.id}] ${s.name || '(untitled)'}`),
    );
    console.log(`${rows.length} scene(s).`);
    break;
  }
  case 'create': {
    const payload = JSON.parse(readStdin() || '{}');
    const items = Array.isArray(payload) ? payload : [payload];
    for (const it of items) {
      const row = first(
        await rpc(env, 'cowork_create_scene', {
          p_name: it.name ?? '',
          p_description: it.description ?? '',
          p_prompt: it.prompt ?? '',
        }),
      );
      console.log(`created [${row.id}] order=${row.order_index} ${row.name || '(untitled)'}`);
    }
    break;
  }
  case 'update': {
    const it = JSON.parse(readStdin() || '{}');
    if (!it.id) die('update requires an "id"');
    const row = first(
      await rpc(env, 'cowork_update_scene', {
        p_id: it.id,
        p_name: it.name ?? null,
        p_description: it.description ?? null,
        p_prompt: it.prompt ?? null,
      }),
    );
    console.log(`updated [${row.id}] ${row.name || '(untitled)'}`);
    break;
  }
  case 'delete': {
    const id = rest[0];
    if (!id) die('delete requires a scene id');
    await rpc(env, 'cowork_delete_scene', { p_id: id });
    console.log(`deleted [${id}]`);
    break;
  }
  case 'reorder': {
    const ids = JSON.parse(readStdin() || '[]');
    await rpc(env, 'cowork_reorder_scenes', { p_ids: ids });
    console.log(`reordered ${ids.length} scene(s)`);
    break;
  }
  case 'set-script': {
    const content = readStdin();
    await rpc(env, 'cowork_set_script', { p_content: content });
    console.log(`script set (${content.length} chars)`);
    break;
  }
  default:
    usage();
    process.exit(1);
}
