#!/usr/bin/env node
// sb — Storyboard agent CLI.
//
// A non-browser client into the same Supabase backend the web app uses, so
// Claude (or you) can push projects, scenes, prompts, and images into the
// storyboard from any machine that has this repo + a .env.local.
//
// Usage:
//   npm run sb -- <command> [args]      (note the `--` before args)
//   node scripts/sb.mjs <command> [args]
//
// Project commands:
//   projects                              List your projects (● = current)
//   project add <name…>                   Create a project and make it current
//   project use <project>                 Set the current project
//   project rename <project> <name…>      Rename a project
//   project rm <project>                  Delete a project (and all its scenes/images)
//
// Scene commands (act on the current project; override with --project):
//   list                                  Show the board
//   add [--name N] [--desc D] [--prompt P] [--image PATH|URL]
//   set <scene> [--name N] [--desc D] [--prompt P]
//   image <scene> <PATH|URL>              Upload/replace a scene's image
//   rm <scene>                            Delete a scene and its stored images
//   script get                            Print the screenplay text
//   script set <PATH|->                   Replace the screenplay text (- reads stdin)
//   help                                  Show this help
//
// <project> = 1-based index from `projects`, a name, a full UUID, or an id prefix.
// <scene>   = 1-based index from `list`, a full UUID, or an id prefix.
// --project <project> scopes any scene command to a specific project for one run.
// --image accepts a local file path OR an http(s) URL (downloaded then uploaded).

import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const BUCKET = 'scene-images';
const STATE_FILE = '.sb-state.json'; // remembers the current project (gitignored)

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
// Local state (current project)
// ---------------------------------------------------------------------------

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

async function setCurrentProject(id) {
  const state = await readState();
  state.projectId = id;
  await writeState(state);
}

async function clearCurrentProjectIf(id) {
  const state = await readState();
  if (state.projectId === id) {
    delete state.projectId;
    await writeState(state);
  }
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

// --- projects ---

async function fetchProjects() {
  const { data, error } = await db()
    .from('projects')
    .select('*')
    .eq('user_id', await ownerId())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function resolveProjectRef(ref, projects) {
  const all = projects ?? (await fetchProjects());
  if (!ref) throw new Error('A project reference (index, name, or id) is required.');
  if (UUID_RE.test(ref)) {
    const p = all.find((x) => x.id === ref);
    if (!p) throw new Error(`No project with id ${ref}`);
    return p;
  }
  const idx = Number(ref);
  if (Number.isInteger(idx) && idx >= 1 && idx <= all.length) return all[idx - 1];

  const lower = ref.toLowerCase();
  const exactName = all.filter((p) => p.name.toLowerCase() === lower);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) throw new Error(`More than one project is named "${ref}" — use its index or id.`);

  const idPrefix = all.filter((p) => p.id.startsWith(ref));
  if (idPrefix.length === 1) return idPrefix[0];

  const namePrefix = all.filter((p) => p.name.toLowerCase().startsWith(lower));
  if (namePrefix.length === 1) return namePrefix[0];

  throw new Error(`Could not resolve project "${ref}". Run \`sb projects\` to list them.`);
}

/** The project a scene command should act on: --project flag, else current, else
 * the only project, else an error that lists the choices. */
async function resolveActiveProject(flags) {
  const projects = await fetchProjects();
  if (flags.project) return resolveProjectRef(String(flags.project), projects);
  if (projects.length === 0) {
    throw new Error('No projects yet. Create one:  sb project add "My Storyboard"');
  }
  const state = await readState();
  if (state.projectId) {
    const p = projects.find((x) => x.id === state.projectId);
    if (p) return p;
  }
  if (projects.length === 1) return projects[0];
  throw new Error(
    'Multiple projects exist and none is selected. Pick one with ' +
      '`sb project use <name|index>` or pass --project. Projects:\n' +
      projects.map((p, i) => `  ${i + 1}. ${p.name}`).join('\n'),
  );
}

async function createProject(name) {
  const { data, error } = await db()
    .from('projects')
    .insert({ user_id: await ownerId(), name: (name || '').trim() || 'Untitled project' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- scenes ---

async function orderedScenes(projectId) {
  const { data, error } = await db()
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function resolveScene(projectId, ref) {
  if (!ref) throw new Error('A scene reference (index, id, or id prefix) is required.');
  const scenes = await orderedScenes(projectId);
  if (UUID_RE.test(ref)) {
    const s = scenes.find((x) => x.id === ref);
    if (!s) throw new Error(`No scene with id ${ref} in this project`);
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

// Informational scope line goes to stderr so it never pollutes piped stdout
// (e.g. `sb script get > file`).
function announce(project) {
  console.error(`Using project: ${project.name}`);
}

// ---------------------------------------------------------------------------
// Project commands
// ---------------------------------------------------------------------------

async function cmdProjects() {
  const projects = await fetchProjects();
  const state = await readState();
  if (projects.length === 0) {
    console.log('No projects yet. Create one:  npm run sb -- project add "My Storyboard"');
    return;
  }
  console.log(`${projects.length} project(s):\n`);
  projects.forEach((p, i) => {
    const dot = p.id === state.projectId ? '●' : ' ';
    const num = String(i + 1).padStart(2, ' ');
    console.log(`${dot} ${num}. ${truncate(p.name, 30).padEnd(30, ' ')}  ${p.id.slice(0, 8)}`);
  });
}

async function cmdProject(positional) {
  const sub = positional[0];
  if (sub === 'add' || sub === 'create' || sub === 'new') {
    const name = positional.slice(1).join(' ');
    if (!name) throw new Error('Provide a name:  sb project add "My Storyboard"');
    const p = await createProject(name);
    await setCurrentProject(p.id);
    console.log(`Created project "${p.name}" (${p.id.slice(0, 8)}) and made it current.`);
    return;
  }
  if (sub === 'use' || sub === 'switch') {
    const p = await resolveProjectRef(positional[1]);
    await setCurrentProject(p.id);
    console.log(`Current project: ${p.name} (${p.id.slice(0, 8)})`);
    return;
  }
  if (sub === 'rename') {
    const p = await resolveProjectRef(positional[1]);
    const name = positional.slice(2).join(' ');
    if (!name) throw new Error('Provide a new name:  sb project rename <project> "New name"');
    const { error } = await db()
      .from('projects')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) throw error;
    console.log(`Renamed to "${name.trim()}" (${p.id.slice(0, 8)})`);
    return;
  }
  if (sub === 'rm' || sub === 'remove' || sub === 'delete') {
    const p = await resolveProjectRef(positional[1]);
    const uid = await ownerId();
    // Clear storage for every scene before the cascade drops the rows.
    const scenes = await orderedScenes(p.id);
    for (const s of scenes) await removeSceneFolder(uid, s.id).catch(() => {});
    const { error } = await db().from('projects').delete().eq('id', p.id);
    if (error) throw error;
    await clearCurrentProjectIf(p.id);
    console.log(`Removed project "${p.name}" and its ${scenes.length} scene(s).`);
    return;
  }
  throw new Error('Usage: sb project <add|use|rename|rm> …   (or `sb projects` to list)');
}

// ---------------------------------------------------------------------------
// Scene commands (scoped to a project)
// ---------------------------------------------------------------------------

async function cmdList(flags) {
  const project = await resolveActiveProject(flags);
  announce(project);
  const scenes = await orderedScenes(project.id);
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
  const project = await resolveActiveProject(flags);
  announce(project);
  const scenes = await orderedScenes(project.id);
  const nextOrder = scenes.length ? Math.max(...scenes.map((s) => s.order_index)) + 1 : 0;

  const { data: scene, error } = await db()
    .from('scenes')
    .insert({
      user_id: uid,
      project_id: project.id,
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
  const project = await resolveActiveProject(flags);
  announce(project);
  const scene = await resolveScene(project.id, positional[0]);
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
  console.log(
    `Updated scene ${scene.id.slice(0, 8)} (${Object.keys(patch)
      .filter((k) => k !== 'updated_at')
      .join(', ')})`,
  );
}

async function cmdImage(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  const scene = await resolveScene(project.id, positional[0]);
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

async function cmdRm(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  const scene = await resolveScene(project.id, positional[0]);
  const { error } = await db().from('scenes').delete().eq('id', scene.id);
  if (error) throw error;
  await removeSceneFolder(uid, scene.id).catch(() => {});
  console.log(`Removed scene ${scene.id.slice(0, 8)}${scene.name ? ` (${scene.name})` : ''}`);
}

async function cmdScript(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  const sub = positional[0];
  if (sub === 'get') {
    const { data, error } = await db()
      .from('script')
      .select('content')
      .eq('project_id', project.id)
      .maybeSingle();
    if (error) throw error;
    process.stdout.write(`${data?.content ?? ''}\n`);
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
        {
          user_id: uid,
          project_id: project.id,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' },
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
      'Project commands:',
      '  projects                               List your projects (● = current)',
      '  project add <name…>                    Create a project + make it current',
      '  project use <project>                  Set the current project',
      '  project rename <project> <name…>       Rename a project',
      '  project rm <project>                   Delete a project (+ its scenes/images)',
      '',
      'Scene commands (act on the current project; override with --project):',
      '  list                                   Show the board',
      '  add [--name N] [--desc D] [--prompt P] [--image PATH|URL]',
      '  set <scene> [--name N] [--desc D] [--prompt P]',
      '  image <scene> <PATH|URL>               Upload/replace a scene image',
      '  rm <scene>                             Delete a scene + its images',
      '  script get                             Print screenplay text',
      '  script set <PATH|->                    Replace screenplay text',
      '',
      '<project> = index from `projects`, a name, a full UUID, or an id prefix.',
      '<scene>   = 1-based index from `list`, a full UUID, or an id prefix.',
      '--project <project> scopes a scene command to a project for one run.',
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
    case 'projects':
      return cmdProjects();
    case 'project':
      return cmdProject(positional);
    case 'list':
      return cmdList(flags);
    case 'add':
      return cmdAdd(flags);
    case 'set':
      return cmdSet(positional, flags);
    case 'image':
      return cmdImage(positional, flags);
    case 'rm':
    case 'remove':
    case 'delete':
      return cmdRm(positional, flags);
    case 'script':
      return cmdScript(positional, flags);
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
