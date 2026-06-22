#!/usr/bin/env node
// sb — Storyboard agent CLI.
//
// A non-browser client into the same Supabase backend the web app uses, so
// Claude (or you) can push scenes, prompts, and images into the storyboard
// from any machine that has this repo + a .env.local.
//
// Usage:
//   npm run sb -- <command> [args]      (note the `--` before args)
//   node scripts/sb.mjs <command> [args]
//
// Commands:
//   list                                  Show the board (index, id, name, prompt, image)
//   add [--name N] [--desc D] [--prompt P] [--image PATH|URL]
//                                         Create a scene at the end of the board
//   set <scene> [--name N] [--desc D] [--prompt P]
//                                         Update fields on a scene
//   image <scene> <PATH|URL>              Upload/replace a scene's image
//   rm <scene>                            Delete a scene and its stored images
//   script get                            Print the screenplay text
//   script set <PATH|->                   Replace the screenplay text (- reads stdin)
//   help                                  Show this help
//
// <scene> can be a 1-based index from `list`, a full UUID, or an id prefix.
// --image accepts a local file path OR an http(s) URL (it is downloaded first).

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const BUCKET = 'scene-images';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local — validated below with a friendly message.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.STORYBOARD_OWNER_EMAIL;
const OWNER_ID = process.env.STORYBOARD_OWNER_USER_ID;

function requireConfig() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!OWNER_EMAIL && !OWNER_ID) missing.push('STORYBOARD_OWNER_EMAIL (or STORYBOARD_OWNER_USER_ID)');
  if (missing.length === 0) return;

  console.error(
    [
      'Storyboard CLI is not configured on this machine.',
      '',
      `Missing: ${missing.join(', ')}`,
      '',
      'Create a .env.local in the project root with:',
      '',
      '  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co',
      '  SUPABASE_SERVICE_ROLE_KEY=...   # Dashboard → Project Settings → API → service_role (SECRET)',
      '  STORYBOARD_OWNER_EMAIL=you@example.com',
      '',
      'The service_role key is secret — never commit it or expose it to the browser.',
      '.env.local is gitignored, so it stays on this machine only.',
    ].join('\n'),
  );
  process.exit(1);
}

let _supabase = null;
async function initClient() {
  let createClient;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
  } catch {
    throw new Error(
      "Dependencies aren't installed. Run `npm install` in the project root first.",
    );
  }
  _supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function db() {
  return _supabase;
}

let _ownerId = null;
async function ownerId() {
  if (_ownerId) return _ownerId;
  if (OWNER_ID) {
    _ownerId = OWNER_ID;
    return _ownerId;
  }
  const { data, error } = await db().auth.admin.listUsers();
  if (error) throw error;
  const user = (data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase(),
  );
  if (!user) {
    throw new Error(
      `No Supabase auth user found for ${OWNER_EMAIL}. ` +
        'Create the owner account in Supabase Auth, or set STORYBOARD_OWNER_USER_ID.',
    );
  }
  _ownerId = user.id;
  return _ownerId;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function orderedScenes() {
  const { data, error } = await db()
    .from('scenes')
    .select('*')
    .eq('user_id', await ownerId())
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function resolveScene(ref) {
  if (!ref) throw new Error('A scene reference (index, id, or id prefix) is required.');
  const scenes = await orderedScenes();
  if (UUID_RE.test(ref)) {
    const s = scenes.find((x) => x.id === ref);
    if (!s) throw new Error(`No scene with id ${ref}`);
    return s;
  }
  const idx = Number(ref);
  if (Number.isInteger(idx) && idx >= 1 && idx <= scenes.length) {
    return scenes[idx - 1];
  }
  const byPrefix = scenes.filter((x) => x.id.startsWith(ref));
  if (byPrefix.length === 1) return byPrefix[0];
  if (byPrefix.length > 1) throw new Error(`Ambiguous scene reference "${ref}" — be more specific.`);
  throw new Error(`Could not resolve scene "${ref}". Run \`sb list\` to see valid indexes/ids.`);
}

const EXT_TO_CT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};
const CT_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

async function loadImage(src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to download image (${res.status} ${res.statusText})`);
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
    const buffer = Buffer.from(await res.arrayBuffer());
    let ext = CT_TO_EXT[ct];
    if (!ext) ext = extname(new URL(src).pathname).slice(1).toLowerCase();
    if (!ext) ext = 'png';
    return { buffer, contentType: ct || EXT_TO_CT[ext] || 'application/octet-stream', ext };
  }
  const buffer = await readFile(src);
  const ext = extname(src).slice(1).toLowerCase() || 'png';
  return { buffer, contentType: EXT_TO_CT[ext] || 'application/octet-stream', ext };
}

async function uploadSceneImage(uid, sceneId, src) {
  const { buffer, contentType, ext } = await loadImage(src);
  const path = `${uid}/${sceneId}/${randomUUID()}.${ext}`;
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

async function removeSceneFolder(uid, sceneId) {
  const prefix = `${uid}/${sceneId}`;
  const { data, error } = await db().storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  if (data && data.length) {
    await db()
      .storage.from(BUCKET)
      .remove(data.map((o) => `${prefix}/${o.name}`));
  }
}

function truncate(s, n) {
  const oneLine = (s ?? '').replace(/\s+/g, ' ').trim();
  return oneLine.length > n ? `${oneLine.slice(0, n - 1)}…` : oneLine;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList() {
  const scenes = await orderedScenes();
  if (scenes.length === 0) {
    console.log('Board is empty. Add a scene with: npm run sb -- add --prompt "..."');
    return;
  }
  console.log(`${scenes.length} scene(s):\n`);
  scenes.forEach((s, i) => {
    const num = String(i + 1).padStart(2, ' ');
    const img = s.image_path ? '🖼 ' : '   ';
    const name = truncate(s.name || '(untitled)', 28).padEnd(28, ' ');
    console.log(`${num}. ${img}${name}  ${s.id.slice(0, 8)}`);
    if (s.prompt) console.log(`      prompt: ${truncate(s.prompt, 90)}`);
  });
}

async function cmdAdd(flags) {
  const uid = await ownerId();
  const scenes = await orderedScenes();
  const nextOrder = scenes.length
    ? Math.max(...scenes.map((s) => s.order_index)) + 1
    : 0;

  const { data: scene, error } = await db()
    .from('scenes')
    .insert({
      user_id: uid,
      order_index: nextOrder,
      name: typeof flags.name === 'string' ? flags.name : '',
      description: typeof flags.desc === 'string' ? flags.desc : '',
      prompt: typeof flags.prompt === 'string' ? flags.prompt : '',
    })
    .select()
    .single();
  if (error) throw error;

  if (typeof flags.image === 'string') {
    const path = await uploadSceneImage(uid, scene.id, flags.image);
    const { error: e2 } = await db()
      .from('scenes')
      .update({ image_path: path, updated_at: new Date().toISOString() })
      .eq('id', scene.id);
    if (e2) {
      await removeSceneFolder(uid, scene.id).catch(() => {});
      throw e2;
    }
    scene.image_path = path;
  }

  console.log(`Added scene #${scenes.length + 1} (${scene.id.slice(0, 8)})`);
  if (scene.name) console.log(`  name: ${scene.name}`);
  if (scene.prompt) console.log(`  prompt: ${truncate(scene.prompt, 90)}`);
  if (scene.image_path) console.log('  image: uploaded ✓');
}

async function cmdSet(positional, flags) {
  const scene = await resolveScene(positional[0]);
  const patch = {};
  if (typeof flags.name === 'string') patch.name = flags.name;
  if (typeof flags.desc === 'string') patch.description = flags.desc;
  if (typeof flags.prompt === 'string') patch.prompt = flags.prompt;
  if (Object.keys(patch).length === 0) {
    throw new Error('Nothing to update. Pass --name, --desc, and/or --prompt.');
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await db().from('scenes').update(patch).eq('id', scene.id);
  if (error) throw error;
  console.log(`Updated scene ${scene.id.slice(0, 8)} (${Object.keys(patch).filter((k) => k !== 'updated_at').join(', ')})`);
}

async function cmdImage(positional) {
  const uid = await ownerId();
  const scene = await resolveScene(positional[0]);
  const src = positional[1];
  if (!src) throw new Error('Provide an image path or URL: sb image <scene> <path|url>');

  const newPath = await uploadSceneImage(uid, scene.id, src);
  const { error } = await db()
    .from('scenes')
    .update({ image_path: newPath, updated_at: new Date().toISOString() })
    .eq('id', scene.id);
  if (error) {
    await db().storage.from(BUCKET).remove([newPath]).catch(() => {});
    throw error;
  }
  if (scene.image_path && scene.image_path !== newPath) {
    await db().storage.from(BUCKET).remove([scene.image_path]).catch(() => {});
  }
  console.log(`Image set on scene ${scene.id.slice(0, 8)} ✓`);
}

async function cmdRm(positional) {
  const uid = await ownerId();
  const scene = await resolveScene(positional[0]);
  const { error } = await db().from('scenes').delete().eq('id', scene.id);
  if (error) throw error;
  await removeSceneFolder(uid, scene.id).catch(() => {});
  console.log(`Removed scene ${scene.id.slice(0, 8)}${scene.name ? ` (${scene.name})` : ''}`);
}

async function cmdScript(positional) {
  const uid = await ownerId();
  const sub = positional[0];
  if (sub === 'get') {
    const { data, error } = await db()
      .from('script')
      .select('content')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    process.stdout.write((data?.content ?? '') + '\n');
    return;
  }
  if (sub === 'set') {
    const source = positional[1];
    if (!source) throw new Error('Provide a file path or - for stdin: sb script set <path|->');
    let content;
    if (source === '-') {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      content = Buffer.concat(chunks).toString('utf8');
    } else {
      content = await readFile(source, 'utf8');
    }
    const { error } = await db()
      .from('script')
      .upsert(
        { user_id: uid, content, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    if (error) throw error;
    console.log(`Script updated (${content.length} chars).`);
    return;
  }
  throw new Error('Usage: sb script get | sb script set <path|->');
}

function printHelp() {
  console.log(
    [
      'sb — Storyboard agent CLI',
      '',
      'Usage: npm run sb -- <command> [args]',
      '',
      'Commands:',
      '  list                                   Show the board',
      '  add [--name N] [--desc D] [--prompt P] [--image PATH|URL]',
      '  set <scene> [--name N] [--desc D] [--prompt P]',
      '  image <scene> <PATH|URL>               Upload/replace a scene image',
      '  rm <scene>                             Delete a scene + its images',
      '  script get                             Print screenplay text',
      '  script set <PATH|->                    Replace screenplay text',
      '',
      '<scene> = 1-based index from `list`, a full UUID, or an id prefix.',
      '--image accepts a local file path or an http(s) URL.',
    ].join('\n'),
  );
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  requireConfig();
  await initClient();
  const { flags, positional } = parseArgs(rest);

  switch (command) {
    case 'list':
      return cmdList();
    case 'add':
      return cmdAdd(flags);
    case 'set':
      return cmdSet(positional, flags);
    case 'image':
      return cmdImage(positional);
    case 'rm':
    case 'remove':
    case 'delete':
      return cmdRm(positional);
    case 'script':
      return cmdScript(positional);
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}`);
  process.exit(1);
});
