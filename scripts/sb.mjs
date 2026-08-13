#!/usr/bin/env node
// sb — Storyboard agent CLI.
//
// A non-browser client into the same Supabase backend the web app uses, so
// Claude (or you) can push projects, scenes, social posts, prompts, and media
// into the app from any machine that has this repo + a .env.local.
//
// Projects come in three kinds: 'storyboard' (film scene boards — the
// original), 'social' (post pipelines: copy + multiple images/videos +
// schedule + status + platforms), and 'merchandise' (product tracking:
// images + supplier + cost/price + dev time + stage). Kind-specific flags
// error on the wrong kind rather than writing a column that board never
// shows.
//
// Usage:
//   npm run sb -- <command> [args]      (note the `--` before args)
//   node scripts/sb.mjs <command> [args]
//
// Project commands:
//   projects                              List your projects (● = current)
//   project add <name…> [--social|--merch]  Create a project and make it current
//   project use <project>                 Set the current project
//   project rename <project> <name…>      Rename a project
//   project rm <project>                  Delete a project (and all its scenes/media)
//
// Scene/post commands (act on the current project; override with --project):
//   list                                  Show the board / pipeline
//   add [--name N] [--desc D] [--prompt P] [--image PATH|URL]
//       [--copy TEXT] [--media PATH|URL]… [--schedule "YYYY-MM-DD[ HH:MM]"]
//       [--platforms a,b,c] [--status S]
//       [--supplier URL] [--cost N] [--price N] [--dev-time TEXT]
//   set <scene> [--name N] [--desc D] [--prompt P] [--copy TEXT]
//       [--schedule …|none] [--platforms …|none] [--status S]
//       [--supplier URL] [--cost N|none] [--price N|none] [--dev-time TEXT]
//   image <scene> <PATH|URL>              Upload/replace a storyboard scene's image
//   media <post> [list]                   List a post's media
//   media <post> add <PATH|URL>…          Append media (images/videos) to a post
//   media <post> rm <n>                   Remove media item n (1-based)
//   media <post> order 3,1,2              Reorder media (full permutation)
//   share [--regenerate]                  Print the read-only share link
//   rm <scene>                            Delete a scene/post and its stored media
//   script get                            Print the script/notes text
//   script set <PATH|->                   Replace the script/notes text (- reads stdin)
//   help                                  Show this help
//
// <project> = 1-based index from `projects`, a name, a full UUID, or an id prefix.
// <scene>/<post> = 1-based index from `list`, a full UUID, or an id prefix.
// --project <project> scopes any scene command to a specific project for one run.
// --image/--media accept a local file path OR an http(s) URL (downloaded then uploaded).

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

function parseArgs(argv, repeatable = new Set()) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (repeatable.has(key)) {
        // Repeatable flags accumulate into an array and always need a value.
        if (next === undefined || next.startsWith('--')) {
          throw new Error(`--${key} requires a value.`);
        }
        (flags[key] ??= []).push(next);
        i++;
      } else if (next === undefined || next.startsWith('--')) {
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

async function createProject(name, kind = 'storyboard') {
  const row = { user_id: await ownerId(), name: (name || '').trim() || 'Untitled project' };
  // Only send kind when non-default so plain storyboard adds still work on a
  // database that hasn't run the social-pipeline migration yet.
  if (kind !== 'storyboard') row.kind = kind;
  const { data, error } = await db().from('projects').insert(row).select().single();
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
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
};
const CT_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
};
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'm4v']);

async function loadMedia(src) {
  let buffer;
  let contentType;
  let ext;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to download media (${res.status} ${res.statusText})`);
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
    buffer = Buffer.from(await res.arrayBuffer());
    ext = CT_TO_EXT[ct];
    if (!ext) ext = extname(new URL(src).pathname).slice(1).toLowerCase();
    if (!ext) {
      console.error(`note: could not detect a type for ${src} — assuming png`);
      ext = 'png';
    }
    contentType = ct || EXT_TO_CT[ext] || 'application/octet-stream';
  } else {
    buffer = await readFile(src);
    ext = extname(src).slice(1).toLowerCase() || 'png';
    contentType = EXT_TO_CT[ext] || 'application/octet-stream';
  }
  const kind = contentType.startsWith('video/') || VIDEO_EXTS.has(ext) ? 'video' : 'image';
  if (kind === 'video' && ext === 'mov') {
    console.error(
      'note: .mov often won’t play in Chrome/Firefox — prefer .mp4 (H.264/AAC) for the share page.',
    );
  }
  return { buffer, contentType, ext, kind };
}

async function uploadSceneMedia(uid, sceneId, src) {
  const { buffer, contentType, ext, kind } = await loadMedia(src);
  const path = `${uid}/${sceneId}/${randomUUID()}.${ext}`;
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return { path, kind };
}

async function uploadSceneImage(uid, sceneId, src) {
  const { path, kind } = await uploadSceneMedia(uid, sceneId, src);
  if (kind !== 'image') {
    await db().storage.from(BUCKET).remove([path]).catch(() => {});
    throw new Error(
      `"${src}" is a video — the image command and --image only accept images. ` +
        'Use --media / `sb media <post> add` on a social project instead.',
    );
  }
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
// Social-post helpers (statuses, platforms, schedule, project kinds)
// ---------------------------------------------------------------------------

// Mirrors the DB CHECK constraint — validate here so users get a friendly
// message instead of a 23514 violation.
const STATUSES = ['idea', 'draft', 'ready', 'scheduled', 'posted'];

// Merchandise stages. `status` is one shared column, so the DB CHECK is the
// union of both lists; the CLI validates against the project's own kind.
const MERCH_STATUSES = ['concept', 'sourcing', 'quotes', 'orders', 'ready'];
const ORDER_STATUSES = ['placed', 'in_production', 'shipped', 'received', 'cancelled'];

const KNOWN_PLATFORMS = [
  'linkedin',
  'instagram',
  'x',
  'facebook',
  'tiktok',
  'youtube',
  'threads',
  'pinterest',
];
const PLATFORM_ALIASES = {
  twitter: 'x',
  ig: 'instagram',
  insta: 'instagram',
  yt: 'youtube',
  fb: 'facebook',
  'in': 'linkedin',
};

function parseStatusFlag(value, kind = 'social') {
  const allowed = kind === 'merchandise' ? MERCH_STATUSES : STATUSES;
  const v = String(value).toLowerCase().trim();
  if (!allowed.includes(v)) {
    throw new Error(`Invalid --status "${value}". One of: ${allowed.join(', ')}`);
  }
  return v;
}

function parseOrderStatusFlag(value) {
  const v = String(value).toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (!ORDER_STATUSES.includes(v)) {
    throw new Error(`Invalid --status "${value}". One of: ${ORDER_STATUSES.join(', ')}`);
  }
  return v;
}

/** Parse a whole-number flag. "none"/"" clears back to unknown (null). */
function parseCountFlag(value, flag) {
  const raw = String(value).trim();
  if (raw === '' || raw.toLowerCase() === 'none') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid ${flag} "${value}" — pass a whole number, or "none" to clear.`);
  }
  return n;
}

/** Parse a YYYY-MM-DD date flag. "none"/"" clears it. */
function parseDateFlag(value, flag) {
  const raw = String(value).trim();
  if (raw === '' || raw.toLowerCase() === 'none') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Invalid ${flag} "${value}" — use YYYY-MM-DD, or "none" to clear.`);
  }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || !d.toISOString().startsWith(raw)) {
    throw new Error(`Invalid ${flag} "${value}" — that date doesn't exist.`);
  }
  return raw;
}

/**
 * Parse a money flag into a number. "none"/"" clears the value back to unknown
 * (null), which is deliberately distinct from a genuine 0.
 */
function parseMoneyFlag(value, flag) {
  const raw = String(value).trim().replace(/^\$/, '');
  if (raw === '' || raw.toLowerCase() === 'none') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${flag} "${value}" — pass a non-negative number, or "none" to clear.`);
  }
  return Math.round(n * 100) / 100;
}

function parsePlatformsFlag(value) {
  const raw = String(value).trim();
  if (raw.toLowerCase() === 'none') return [];
  const slugs = raw
    .split(',')
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean)
    .map((s) => PLATFORM_ALIASES[s] ?? s);
  const unique = [...new Set(slugs)];
  if (unique.length === 0) {
    throw new Error('Provide --platforms as a comma list (e.g. instagram,linkedin) or "none".');
  }
  for (const slug of unique) {
    if (!KNOWN_PLATFORMS.includes(slug)) {
      console.error(`note: unknown platform "${slug}" (known: ${KNOWN_PLATFORMS.join(', ')})`);
    }
  }
  return unique;
}

// "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" (24h, machine-local time) → ISO string.
// "none" clears the schedule (set only).
function parseScheduleFlag(value) {
  const raw = String(value).trim();
  if (raw.toLowerCase() === 'none') return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/);
  if (!m) {
    throw new Error(
      `Invalid --schedule "${value}". Use "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" ` +
        '(24-hour, local time), or "none" to clear.',
    );
  }
  const [, y, mo, d, hh, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh ?? 0), Number(mi ?? 0));
  const valid =
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(mo) - 1 &&
    date.getDate() === Number(d) &&
    date.getHours() === Number(hh ?? 0) &&
    date.getMinutes() === Number(mi ?? 0);
  if (!valid) throw new Error(`Invalid --schedule "${value}" — that date/time doesn't exist.`);
  return date.toISOString();
}

// Pre-migration databases have no kind column; treat undefined as storyboard
// so all the original commands keep working there.
function projectKind(project) {
  return project.kind ?? 'storyboard';
}

const money = (v) => (v === null || v === undefined ? '—' : `$${Number(v).toFixed(2)}`);

/** Fetch merch_quotes / merch_orders for many products, keyed by scene_id. */
async function fetchLines(table, sceneIds) {
  if (sceneIds.length === 0) return {};
  const { data, error } = await db()
    .from(table)
    .select('*')
    .in('scene_id', sceneIds)
    .order('position', { ascending: true });
  if (error) throw error;
  const map = {};
  for (const id of sceneIds) map[id] = [];
  for (const row of data ?? []) (map[row.scene_id] ??= []).push(row);
  return map;
}

/** Cheapest priced quote. Rows without a cost are sourcing leads, not quotes. */
function bestUnitCost(quotes) {
  const priced = quotes.filter((q) => q.unit_cost !== null && q.unit_cost !== undefined);
  if (priced.length === 0) return null;
  return priced.reduce((lo, q) => (Number(q.unit_cost) < Number(lo) ? Number(q.unit_cost) : lo),
    Number(priced[0].unit_cost));
}

/** Resolve a 1-based index / id prefix within a product's quote or order rows. */
function resolveLine(rows, ref, what) {
  if (!ref) throw new Error(`Which ${what}? Pass its number from \`list\`, or an id prefix.`);
  const n = Number(ref);
  if (Number.isInteger(n) && n >= 1 && n <= rows.length) return rows[n - 1];
  const matches = rows.filter((r) => r.id === ref || r.id.startsWith(String(ref)));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`"${ref}" matches more than one ${what}.`);
  throw new Error(`No ${what} "${ref}" on that product.`);
}

/** What a scenes row is called in a given project kind. */
function rowNoun(kind) {
  if (kind === 'social') return 'post';
  if (kind === 'merchandise') return 'item';
  return 'scene';
}

/**
 * Multi-media rows (scene_media) back both social posts and merchandise
 * items; only storyboard scenes use the single image_path instead.
 */
function assertHasMedia(project, what) {
  if (projectKind(project) === 'storyboard') {
    throw new Error(
      `"${project.name}" is a storyboard project — ${what} needs a social or ` +
        'merchandise project. Storyboard scenes take a single --image instead.',
    );
  }
}

function assertSocial(project, what) {
  if (projectKind(project) !== 'social') {
    throw new Error(
      `"${project.name}" is a ${projectKind(project)} project — ${what} only applies to social ` +
        'projects. Create one with:  sb project add "Name" --social',
    );
  }
}

function assertMerch(project, what) {
  if (projectKind(project) !== 'merchandise') {
    throw new Error(
      `"${project.name}" is a ${projectKind(project)} project — ${what} only applies to ` +
        'merchandise projects. Create one with:  sb project add "Name" --kind merchandise',
    );
  }
}

function assertStoryboard(project, what) {
  if (projectKind(project) !== 'storyboard') {
    throw new Error(
      `"${project.name}" is a ${projectKind(project)} project — ${what} is for storyboard scenes. ` +
        'Use --media / `sb media <item> add` instead.',
    );
  }
}

async function fetchSceneMediaRows(sceneId) {
  const { data, error } = await db()
    .from('scene_media')
    .select('*')
    .eq('scene_id', sceneId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function insertMediaRow(uid, sceneId, { path, kind }, position) {
  const { data, error } = await db()
    .from('scene_media')
    .insert({ user_id: uid, scene_id: sceneId, kind, path, position })
    .select()
    .single();
  if (error) {
    await db().storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  return data;
}

function formatSchedule(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (d.getHours() === 0 && d.getMinutes() === 0) return date;
  return `${date}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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
    // Blank tag for storyboard keeps the original output shape.
    const kind = projectKind(p);
    const tag = kind === 'storyboard' ? '' : `  [${kind}]`;
    console.log(`${dot} ${num}. ${truncate(p.name, 30).padEnd(30, ' ')}  ${p.id.slice(0, 8)}${tag}`);
  });
}

async function cmdProject(positional, flags) {
  const sub = positional[0];
  if (sub === 'add' || sub === 'create' || sub === 'new') {
    const name = positional.slice(1).join(' ');
    if (!name) throw new Error('Provide a name:  sb project add "My Storyboard"');
    let kind = 'storyboard';
    if (flags.social === true) kind = 'social';
    else if (flags.merch === true || flags.merchandise === true) kind = 'merchandise';
    else if (typeof flags.kind === 'string') {
      kind = flags.kind.toLowerCase().trim();
      if (kind === 'merch') kind = 'merchandise';
      if (kind !== 'storyboard' && kind !== 'social' && kind !== 'merchandise') {
        throw new Error(
          `Invalid --kind "${flags.kind}". Use storyboard, social, or merchandise.`,
        );
      }
    }
    const p = await createProject(name, kind);
    await setCurrentProject(p.id);
    const label =
      kind === 'social' ? 'social project' : kind === 'merchandise' ? 'merchandise project' : 'project';
    console.log(`Created ${label} "${p.name}" (${p.id.slice(0, 8)}) and made it current.`);
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

  if (projectKind(project) === 'merchandise') {
    if (scenes.length === 0) {
      console.log('Board is empty. Add an item with: npm run sb -- add --name "Plushie"');
      return;
    }
    const { data: mediaRows, error } = await db()
      .from('scene_media')
      .select('scene_id')
      .in('scene_id', scenes.map((s) => s.id));
    if (error) throw error;
    const mediaCount = {};
    (mediaRows ?? []).forEach((m) => {
      mediaCount[m.scene_id] = (mediaCount[m.scene_id] ?? 0) + 1;
    });

    const quotes = await fetchLines('merch_quotes', scenes.map((s) => s.id));
    const orders = await fetchLines('merch_orders', scenes.map((s) => s.id));

    console.log(`${scenes.length} product(s):\n`);
    scenes.forEach((s, i) => {
      const num = String(i + 1).padStart(2, ' ');
      const name = truncate(s.name || '(untitled)', 28).padEnd(28, ' ');
      const q = quotes[s.id] ?? [];
      const o = orders[s.id] ?? [];
      console.log(`${num}. ${name}  ${s.id.slice(0, 8)}`);
      const parts = [
        `stage: ${s.status ?? 'concept'}`,
        `best: ${money(bestUnitCost(q))}`,
        `price: ${money(s.sale_price)}`,
        `quotes: ${q.length}`,
        `orders: ${o.length}`,
        `images: ${mediaCount[s.id] ?? 0}`,
      ];
      if (s.dev_time) parts.push(`dev: ${s.dev_time}`);
      console.log(`      ${parts.join(' · ')}`);
      if (s.description) console.log(`      desc: ${truncate(s.description, 90)}`);
      q.forEach((row, qi) => {
        const bits = [money(row.unit_cost)];
        if (row.moq !== null && row.moq !== undefined) bits.push(`MOQ ${row.moq}`);
        if (row.lead_time) bits.push(row.lead_time);
        console.log(
          `      q${qi + 1}. ${truncate(row.supplier || '(unnamed supplier)', 26).padEnd(26, ' ')} ${bits.join(' · ')}`,
        );
      });
      o.forEach((row, oi) => {
        const total =
          row.quantity !== null && row.unit_cost !== null
            ? money(Number(row.quantity) * Number(row.unit_cost))
            : '—';
        console.log(
          `      o${oi + 1}. ${truncate(row.supplier || '(unnamed)', 20).padEnd(20, ' ')} ${row.quantity ?? '—'} x ${money(row.unit_cost)} = ${total}  [${row.status}]`,
        );
      });
    });
    return;
  }

  if (projectKind(project) === 'social') {
    if (scenes.length === 0) {
      console.log('Pipeline is empty. Add a post with: npm run sb -- add --copy "..."');
      return;
    }
    // Media counts in one query; the table exists whenever a project can be
    // social (the same migration adds both).
    const { data: mediaRows, error } = await db()
      .from('scene_media')
      .select('scene_id')
      .in('scene_id', scenes.map((s) => s.id));
    if (error) throw error;
    const mediaCount = {};
    (mediaRows ?? []).forEach((m) => {
      mediaCount[m.scene_id] = (mediaCount[m.scene_id] ?? 0) + 1;
    });

    console.log(`${scenes.length} post(s):\n`);
    scenes.forEach((s, i) => {
      const num = String(i + 1).padStart(2, ' ');
      const name = truncate(s.name || '(untitled)', 28).padEnd(28, ' ');
      console.log(`${num}. ${name}  ${s.id.slice(0, 8)}`);
      const parts = [
        `status: ${s.status ?? 'draft'}`,
        `sched: ${formatSchedule(s.scheduled_at)}`,
        `platforms: ${s.platforms?.length ? s.platforms.join(', ') : '—'}`,
        `media: ${mediaCount[s.id] ?? 0}`,
      ];
      console.log(`      ${parts.join(' · ')}`);
      if (s.copy) console.log(`      copy: ${truncate(s.copy, 90)}`);
      if (s.prompt) console.log(`      prompt: ${truncate(s.prompt, 90)}`);
    });
    return;
  }

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

  const kind = projectKind(project);
  const merchFlagUsed =
    typeof flags.price === 'string' || typeof flags['dev-time'] === 'string';
  const socialFlagUsed =
    typeof flags.copy === 'string' ||
    typeof flags.schedule === 'string' ||
    typeof flags.platforms === 'string';
  // --media and --status are shared by social and merchandise.
  const mediaFlagUsed = Array.isArray(flags.media);

  if (merchFlagUsed) assertMerch(project, 'that flag set (--price/--dev-time)');
  if (socialFlagUsed) assertSocial(project, 'that flag set (--copy/--schedule/--platforms)');
  if (mediaFlagUsed) assertHasMedia(project, '--media');
  if (typeof flags.image === 'string') assertStoryboard(project, '--image');
  const isSocial = kind === 'social';

  const scenes = await orderedScenes(project.id);
  const nextOrder = scenes.length ? Math.max(...scenes.map((s) => s.order_index)) + 1 : 0;

  const row = {
    user_id: uid,
    project_id: project.id,
    order_index: nextOrder,
    name: typeof flags.name === 'string' ? flags.name : '',
    description: typeof flags.desc === 'string' ? flags.desc : '',
    prompt: typeof flags.prompt === 'string' ? flags.prompt : '',
  };
  // Only include post columns when their flags were passed, so storyboard adds
  // keep working on a database that hasn't run the migration yet.
  if (typeof flags.copy === 'string') row.copy = flags.copy;
  if (typeof flags.status === 'string') row.status = parseStatusFlag(flags.status, kind);
  if (typeof flags.schedule === 'string') row.scheduled_at = parseScheduleFlag(flags.schedule);
  if (typeof flags.platforms === 'string') row.platforms = parsePlatformsFlag(flags.platforms);
  // Merchandise sourcing fields.
  if (typeof flags.price === 'string') row.sale_price = parseMoneyFlag(flags.price, '--price');
  if (typeof flags['dev-time'] === 'string') row.dev_time = flags['dev-time'];
  // New merchandise rows start at the board's first stage, not the column
  // default 'draft' (a social stage), so they don't land off-board.
  if (kind === 'merchandise' && row.status === undefined) row.status = 'idea';

  const { data: scene, error } = await db().from('scenes').insert(row).select().single();
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

  // Upload media sequentially; on a failure keep what already landed and tell
  // the user how to resume, so a flaky URL never orphans the whole post.
  let mediaAdded = 0;
  if (Array.isArray(flags.media)) {
    for (let i = 0; i < flags.media.length; i++) {
      const src = flags.media[i];
      try {
        const uploaded = await uploadSceneMedia(uid, scene.id, src);
        await insertMediaRow(uid, scene.id, uploaded, i);
        mediaAdded++;
      } catch (err) {
        throw new Error(
          `Post created (${scene.id.slice(0, 8)}) but media #${i + 1} ("${src}") failed: ` +
            `${err.message || err}. Add it with: sb media ${scene.id.slice(0, 8)} add <src>`,
        );
      }
    }
  }

  console.log(`Added ${rowNoun(kind)} #${scenes.length + 1} (${scene.id.slice(0, 8)})`);
  if (scene.name) console.log(`  name: ${scene.name}`);
  if (scene.copy) console.log(`  copy: ${truncate(scene.copy, 90)}`);
  if (typeof flags.status === 'string') console.log(`  status: ${scene.status}`);
  if (scene.scheduled_at) console.log(`  sched: ${formatSchedule(scene.scheduled_at)}`);
  if (scene.platforms?.length) console.log(`  platforms: ${scene.platforms.join(', ')}`);
  if (scene.prompt) console.log(`  prompt: ${truncate(scene.prompt, 90)}`);
  if (scene.image_path) console.log('  image: uploaded ✓');
  if (mediaAdded) console.log(`  media: ${mediaAdded} uploaded ✓`);
}

async function cmdSet(positional, flags) {
  const project = await resolveActiveProject(flags);
  announce(project);
  const scene = await resolveScene(project.id, positional[0]);

  const kind = projectKind(project);
  const merchFlagUsed =
    typeof flags.price === 'string' || typeof flags['dev-time'] === 'string';
  const socialFlagUsed =
    typeof flags.copy === 'string' ||
    typeof flags.schedule === 'string' ||
    typeof flags.platforms === 'string';

  if (merchFlagUsed) assertMerch(project, 'that flag set (--price/--dev-time)');
  if (socialFlagUsed) assertSocial(project, 'that flag set (--copy/--schedule/--platforms)');
  if (typeof flags.status === 'string' && kind === 'storyboard') {
    assertSocial(project, '--status');
  }
  const isSocial = kind === 'social';

  const patch = {};
  if (typeof flags.name === 'string') patch.name = flags.name;
  if (typeof flags.desc === 'string') patch.description = flags.desc;
  if (typeof flags.prompt === 'string') patch.prompt = flags.prompt;
  if (typeof flags.copy === 'string') patch.copy = flags.copy;
  if (typeof flags.status === 'string') patch.status = parseStatusFlag(flags.status, kind);
  if (typeof flags.schedule === 'string') patch.scheduled_at = parseScheduleFlag(flags.schedule);
  if (typeof flags.platforms === 'string') patch.platforms = parsePlatformsFlag(flags.platforms);
  if (typeof flags.price === 'string') patch.sale_price = parseMoneyFlag(flags.price, '--price');
  if (typeof flags['dev-time'] === 'string') patch.dev_time = flags['dev-time'];
  if (Object.keys(patch).length === 0) {
    throw new Error(
      kind === 'merchandise'
        ? 'Nothing to update. Pass --name, --desc, --status, --price, and/or --dev-time.'
        : isSocial
          ? 'Nothing to update. Pass --name, --desc, --prompt, --copy, --status, --schedule, and/or --platforms.'
          : 'Nothing to update. Pass --name, --desc, and/or --prompt.',
    );
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await db().from('scenes').update(patch).eq('id', scene.id);
  if (error) throw error;
  console.log(
    `Updated ${rowNoun(kind)} ${scene.id.slice(0, 8)} (${Object.keys(patch)
      .filter((k) => k !== 'updated_at')
      .join(', ')})`,
  );
}

/**
 * `quote <product> [list|add|set <n>|rm <n>]` — the suppliers under a product.
 * A row with no --cost is a sourcing lead; adding a cost makes it a quote.
 */
async function cmdQuote(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  assertMerch(project, 'the quote command');
  const scene = await resolveScene(project.id, positional[0]);
  const sub = positional[1] ?? 'list';
  const rows = (await fetchLines('merch_quotes', [scene.id]))[scene.id] ?? [];

  if (sub === 'list') {
    if (rows.length === 0) {
      console.log(`No suppliers on "${scene.name || scene.id.slice(0, 8)}".`);
      return;
    }
    console.log(`${rows.length} supplier(s) on "${scene.name || scene.id.slice(0, 8)}":\n`);
    rows.forEach((r, i) => {
      console.log(` ${i + 1}. ${r.supplier || '(unnamed supplier)'}  ${r.id.slice(0, 8)}`);
      const bits = [`cost: ${money(r.unit_cost)}`];
      if (r.moq !== null) bits.push(`MOQ: ${r.moq}`);
      if (r.lead_time) bits.push(`lead: ${r.lead_time}`);
      console.log(`      ${bits.join(' · ')}`);
      if (r.contact) console.log(`      contact: ${r.contact}`);
      if (r.url) console.log(`      url: ${truncate(r.url, 80)}`);
      if (r.notes) console.log(`      notes: ${truncate(r.notes, 90)}`);
    });
    return;
  }

  if (sub === 'add') {
    const row = {
      user_id: uid,
      scene_id: scene.id,
      position: rows.length,
      supplier: typeof flags.supplier === 'string' ? flags.supplier : '',
      contact: typeof flags.contact === 'string' ? flags.contact : '',
      url: typeof flags.url === 'string' ? flags.url.trim() : '',
      lead_time: typeof flags['lead-time'] === 'string' ? flags['lead-time'] : '',
      notes: typeof flags.notes === 'string' ? flags.notes : '',
    };
    if (typeof flags.cost === 'string') row.unit_cost = parseMoneyFlag(flags.cost, '--cost');
    if (typeof flags.moq === 'string') row.moq = parseCountFlag(flags.moq, '--moq');
    const { data, error } = await db().from('merch_quotes').insert(row).select().single();
    if (error) throw error;
    console.log(`Added supplier ${data.id.slice(0, 8)} to "${scene.name || 'product'}"`);
    return;
  }

  if (sub === 'set') {
    const target = resolveLine(rows, positional[2], 'supplier');
    const patch = {};
    if (typeof flags.supplier === 'string') patch.supplier = flags.supplier;
    if (typeof flags.contact === 'string') patch.contact = flags.contact;
    if (typeof flags.url === 'string') patch.url = flags.url.trim();
    if (typeof flags['lead-time'] === 'string') patch.lead_time = flags['lead-time'];
    if (typeof flags.notes === 'string') patch.notes = flags.notes;
    if (typeof flags.cost === 'string') patch.unit_cost = parseMoneyFlag(flags.cost, '--cost');
    if (typeof flags.moq === 'string') patch.moq = parseCountFlag(flags.moq, '--moq');
    if (Object.keys(patch).length === 0) {
      throw new Error(
        'Nothing to update. Pass --supplier, --contact, --url, --cost, --moq, --lead-time, and/or --notes.',
      );
    }
    patch.updated_at = new Date().toISOString();
    const { error } = await db().from('merch_quotes').update(patch).eq('id', target.id);
    if (error) throw error;
    console.log(
      `Updated supplier ${target.id.slice(0, 8)} (${Object.keys(patch)
        .filter((k) => k !== 'updated_at')
        .join(', ')})`,
    );
    return;
  }

  if (sub === 'rm' || sub === 'remove' || sub === 'delete') {
    const target = resolveLine(rows, positional[2], 'supplier');
    const { error } = await db().from('merch_quotes').delete().eq('id', target.id);
    if (error) throw error;
    console.log(`Removed supplier ${target.id.slice(0, 8)}`);
    return;
  }

  throw new Error('Usage: sb quote <product> <list|add|set <n>|rm <n>> [flags]');
}

/** `order <product> [list|add|set <n>|rm <n>]` — orders placed on a product. */
async function cmdOrder(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  assertMerch(project, 'the order command');
  const scene = await resolveScene(project.id, positional[0]);
  const sub = positional[1] ?? 'list';
  const rows = (await fetchLines('merch_orders', [scene.id]))[scene.id] ?? [];

  if (sub === 'list') {
    if (rows.length === 0) {
      console.log(`No orders on "${scene.name || scene.id.slice(0, 8)}".`);
      return;
    }
    console.log(`${rows.length} order(s) on "${scene.name || scene.id.slice(0, 8)}":\n`);
    rows.forEach((r, i) => {
      const total =
        r.quantity !== null && r.unit_cost !== null
          ? money(Number(r.quantity) * Number(r.unit_cost))
          : '—';
      console.log(` ${i + 1}. ${r.supplier || '(unnamed)'}  ${r.id.slice(0, 8)}  [${r.status}]`);
      console.log(`      ${r.quantity ?? '—'} x ${money(r.unit_cost)} = ${total}`);
      if (r.ordered_at || r.expected_at) {
        console.log(`      ordered: ${r.ordered_at ?? '—'} · due: ${r.expected_at ?? '—'}`);
      }
      if (r.notes) console.log(`      notes: ${truncate(r.notes, 90)}`);
    });
    return;
  }

  if (sub === 'add') {
    const row = {
      user_id: uid,
      scene_id: scene.id,
      position: rows.length,
      supplier: typeof flags.supplier === 'string' ? flags.supplier : '',
      notes: typeof flags.notes === 'string' ? flags.notes : '',
    };
    if (typeof flags.qty === 'string') row.quantity = parseCountFlag(flags.qty, '--qty');
    if (typeof flags.cost === 'string') row.unit_cost = parseMoneyFlag(flags.cost, '--cost');
    if (typeof flags.ordered === 'string') row.ordered_at = parseDateFlag(flags.ordered, '--ordered');
    if (typeof flags.due === 'string') row.expected_at = parseDateFlag(flags.due, '--due');
    if (typeof flags.status === 'string') row.status = parseOrderStatusFlag(flags.status);
    const { data, error } = await db().from('merch_orders').insert(row).select().single();
    if (error) throw error;
    console.log(`Added order ${data.id.slice(0, 8)} to "${scene.name || 'product'}"`);
    return;
  }

  if (sub === 'set') {
    const target = resolveLine(rows, positional[2], 'order');
    const patch = {};
    if (typeof flags.supplier === 'string') patch.supplier = flags.supplier;
    if (typeof flags.notes === 'string') patch.notes = flags.notes;
    if (typeof flags.qty === 'string') patch.quantity = parseCountFlag(flags.qty, '--qty');
    if (typeof flags.cost === 'string') patch.unit_cost = parseMoneyFlag(flags.cost, '--cost');
    if (typeof flags.ordered === 'string') patch.ordered_at = parseDateFlag(flags.ordered, '--ordered');
    if (typeof flags.due === 'string') patch.expected_at = parseDateFlag(flags.due, '--due');
    if (typeof flags.status === 'string') patch.status = parseOrderStatusFlag(flags.status);
    if (Object.keys(patch).length === 0) {
      throw new Error(
        'Nothing to update. Pass --supplier, --qty, --cost, --ordered, --due, --status, and/or --notes.',
      );
    }
    patch.updated_at = new Date().toISOString();
    const { error } = await db().from('merch_orders').update(patch).eq('id', target.id);
    if (error) throw error;
    console.log(
      `Updated order ${target.id.slice(0, 8)} (${Object.keys(patch)
        .filter((k) => k !== 'updated_at')
        .join(', ')})`,
    );
    return;
  }

  if (sub === 'rm' || sub === 'remove' || sub === 'delete') {
    const target = resolveLine(rows, positional[2], 'order');
    const { error } = await db().from('merch_orders').delete().eq('id', target.id);
    if (error) throw error;
    console.log(`Removed order ${target.id.slice(0, 8)}`);
    return;
  }

  throw new Error('Usage: sb order <product> <list|add|set <n>|rm <n>> [flags]');
}

async function cmdMedia(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  assertHasMedia(project, 'the media command');
  const noun = rowNoun(projectKind(project));
  const scene = await resolveScene(project.id, positional[0]);
  const sub = positional[1] ?? 'list';

  if (sub === 'list') {
    const media = await fetchSceneMediaRows(scene.id);
    if (media.length === 0) {
      console.log(`No media on ${noun} ${scene.id.slice(0, 8)}. Add some: sb media ${scene.id.slice(0, 8)} add <path|url>`);
      return;
    }
    console.log(`${media.length} media item(s) on ${noun} ${scene.id.slice(0, 8)}:\n`);
    media.forEach((m, i) => {
      const num = String(i + 1).padStart(2, ' ');
      const ext = (m.path.split('.').pop() || '').toLowerCase();
      const icon = m.kind === 'video' ? '🎞' : '🖼';
      console.log(`${num}. ${icon} ${m.kind.padEnd(5, ' ')} .${ext.padEnd(4, ' ')} ${m.id.slice(0, 8)}`);
    });
    return;
  }

  if (sub === 'add') {
    const sources = [...positional.slice(2), ...(Array.isArray(flags.media) ? flags.media : [])];
    if (sources.length === 0) {
      throw new Error('Provide one or more paths/URLs: sb media <post> add <path|url> …');
    }
    const existing = await fetchSceneMediaRows(scene.id);
    let position = existing.length ? Math.max(...existing.map((m) => m.position)) + 1 : 0;
    let added = 0;
    for (const src of sources) {
      try {
        const uploaded = await uploadSceneMedia(uid, scene.id, src);
        await insertMediaRow(uid, scene.id, uploaded, position);
        position++;
        added++;
      } catch (err) {
        throw new Error(
          `Added ${added} of ${sources.length}; "${src}" failed: ${err.message || err}. ` +
            'Re-run `sb media … add` with the remaining sources.',
        );
      }
    }
    console.log(`Added ${added} media item(s) to ${noun} ${scene.id.slice(0, 8)} ✓`);
    return;
  }

  if (sub === 'rm' || sub === 'remove' || sub === 'delete') {
    const media = await fetchSceneMediaRows(scene.id);
    const n = Number(positional[2]);
    if (!Number.isInteger(n) || n < 1 || n > media.length) {
      throw new Error(`Pick a media index 1–${media.length} (from \`sb media ${positional[0]}\`).`);
    }
    const item = media[n - 1];
    const { error } = await db().from('scene_media').delete().eq('id', item.id);
    if (error) throw error;
    await db().storage.from(BUCKET).remove([item.path]).catch(() => {});
    // Renumber survivors so positions stay dense.
    const survivors = media.filter((m) => m.id !== item.id);
    if (survivors.length) {
      const rows = survivors.map((m, i) => ({ ...m, position: i }));
      const { error: e2 } = await db().from('scene_media').upsert(rows, { onConflict: 'id' });
      if (e2) throw e2;
    }
    console.log(`Removed media #${n} (${item.kind}) from ${noun} ${scene.id.slice(0, 8)}`);
    return;
  }

  if (sub === 'order') {
    const media = await fetchSceneMediaRows(scene.id);
    const spec = (positional[2] ?? '').split(',').map((s) => Number(s.trim()));
    const sorted = [...spec].sort((a, b) => a - b);
    const isPermutation =
      spec.length === media.length && sorted.every((v, i) => v === i + 1);
    if (!isPermutation) {
      throw new Error(
        `--order must be a full permutation of 1..${media.length} (e.g. "sb media <post> order 3,1,2").`,
      );
    }
    const rows = spec.map((idx, i) => ({ ...media[idx - 1], position: i }));
    const { error } = await db().from('scene_media').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
    console.log(`Reordered ${media.length} media item(s) on ${noun} ${scene.id.slice(0, 8)} ✓`);
    return;
  }

  throw new Error('Usage: sb media <post> [list | add <path|url>… | rm <n> | order 3,1,2]');
}

async function cmdShare(flags) {
  const project = await resolveActiveProject(flags);
  announce(project);

  if (flags.regenerate === true) {
    const token = randomUUID();
    const { error } = await db()
      .from('projects')
      .update({ share_token: token, updated_at: new Date().toISOString() })
      .eq('id', project.id);
    if (error) throw error;
    project.share_token = token;
    console.error('Share link regenerated — previous links no longer work.');
  }

  if (!project.share_token) {
    throw new Error(
      'This database has no share tokens yet — run ' +
        'supabase/migrations/0002_social_pipeline.sql in the Supabase SQL editor first.',
    );
  }

  const base = (process.env.STORYBOARD_APP_URL || '').replace(/\/+$/, '');
  if (base) {
    console.log(`${base}/share/${project.share_token}`);
  } else {
    console.log(`/share/${project.share_token}`);
    console.error('Set STORYBOARD_APP_URL in .env.local to print full share URLs.');
  }
}

async function cmdImage(positional, flags) {
  const uid = await ownerId();
  const project = await resolveActiveProject(flags);
  announce(project);
  assertStoryboard(project, 'the image command');
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
      'sb — Storyboard agent CLI (storyboards + social pipelines + merchandise)',
      '',
      'Usage: npm run sb -- <command> [args]',
      '',
      'Project commands:',
      '  projects                               List your projects (● = current)',
      '  project add <name…> [--social|--merch] Create a project + make it current',
      '  project use <project>                  Set the current project',
      '  project rename <project> <name…>       Rename a project',
      '  project rm <project>                   Delete a project (+ its scenes/media)',
      '',
      'Scene/post commands (act on the current project; override with --project):',
      '  list                                   Show the board / pipeline',
      '  add [--name N] [--desc D] [--prompt P] [--image PATH|URL]',
      '      [--copy TEXT] [--media PATH|URL]… [--schedule "YYYY-MM-DD[ HH:MM]"]',
      '      [--platforms a,b,c] [--status S]',
      '      [--price N] [--dev-time TEXT]                          (merch)',
      '  set <scene> [--name N] [--desc D] [--prompt P] [--copy TEXT]',
      '      [--schedule …|none] [--platforms …|none] [--status S]',
      '      [--price N|none] [--dev-time TEXT]                     (merch)',
      '  quote <product> [list]                 List a product’s suppliers',
      '  quote <product> add|set <n> [--supplier N] [--contact C] [--url U]',
      '      [--cost N|none] [--moq N|none] [--lead-time T] [--notes T]',
      '  quote <product> rm <n>                 Remove a supplier/quote',
      '  order <product> [list]                 List a product’s orders',
      '  order <product> add|set <n> [--supplier N] [--qty N] [--cost N]',
      '      [--ordered YYYY-MM-DD] [--due YYYY-MM-DD] [--status S] [--notes T]',
      '  order <product> rm <n>                 Remove an order',
      '  image <scene> <PATH|URL>               Upload/replace a storyboard scene image',
      '  media <post> [list]                    List a post’s media',
      '  media <post> add <PATH|URL>…           Append images/videos to a post',
      '  media <post> rm <n>                    Remove media item n (1-based)',
      '  media <post> order 3,1,2               Reorder media (full permutation)',
      '  share [--regenerate]                   Print the read-only share link',
      '  rm <scene>                             Delete a scene/post + its media',
      '  script get                             Print script/notes text',
      '  script set <PATH|->                    Replace script/notes text',
      '',
      '<project> = index from `projects`, a name, a full UUID, or an id prefix.',
      '<scene>/<post> = 1-based index from `list`, a full UUID, or an id prefix.',
      '--project <project> scopes a scene command to a project for one run.',
      '--image/--media accept a local file path or an http(s) URL. --media repeats.',
      `--status (social) is one of: ${STATUSES.join(', ')}.`,
      `--status (merchandise) is one of: ${MERCH_STATUSES.join(', ')}.`,
      `order --status is one of: ${ORDER_STATUSES.join(', ')}.`,
      '--cost/--price/--moq/--qty take a number; "none" clears back to unknown.',
      'A supplier with no --cost is a sourcing lead; adding a cost makes it a quote.',
      '--schedule is local time; "none" clears it (same for --platforms).',
      'Platform aliases normalize (twitter→x, ig→instagram, …); unknowns warn.',
      'Videos: prefer .mp4 (H.264) ≤50MB (Supabase per-file cap; raiseable).',
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
  const { flags, positional } = parseArgs(rest, new Set(['media']));

  switch (command) {
    case 'projects':
      return cmdProjects();
    case 'project':
      return cmdProject(positional, flags);
    case 'list':
      return cmdList(flags);
    case 'add':
      return cmdAdd(flags);
    case 'set':
      return cmdSet(positional, flags);
    case 'image':
      return cmdImage(positional, flags);
    case 'media':
      return cmdMedia(positional, flags);
    case 'quote':
    case 'quotes':
      return cmdQuote(positional, flags);
    case 'order':
    case 'orders':
      return cmdOrder(positional, flags);
    case 'share':
      return cmdShare(flags);
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

// Errors that smell like "the social-pipeline migration hasn't run here yet"
// get a pointer to the fix instead of a bare Postgres/PostgREST code.
function migrationHint(err) {
  const code = err?.code ?? '';
  const msg = String(err?.message ?? err ?? '');
  const missingSchema =
    ['PGRST204', 'PGRST205', '42703', '42P01'].includes(code) ||
    /schema cache|does not exist/i.test(msg);
  if (missingSchema && /kind|share_token|scene_media|copy|status|scheduled_at|platforms/i.test(msg)) {
    return (
      '\nThis database hasn’t run the social-pipeline migration yet. Run ' +
      'supabase/migrations/0002_social_pipeline.sql in the Supabase SQL editor ' +
      '(take a backup first).'
    );
  }
  if (/maximum allowed size|payload too large|exceeded/i.test(msg)) {
    return (
      '\nThe file exceeds Supabase’s per-file upload cap (50MB by default). ' +
      'Raise it under Dashboard → Storage → Settings, or compress the video.'
    );
  }
  return '';
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}${migrationHint(err)}`);
  process.exit(1);
});
