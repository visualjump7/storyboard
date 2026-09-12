import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the supplied local catalog as data. This script makes no network requests.
// Usage: node scripts/import-camera-references.mjs <catalog.json> [--check]
const inputPath = process.argv.slice(2).find((argument) => argument !== '--check');
const checkOnly = process.argv.includes('--check');
if (!inputPath) {
  throw new Error('Pass the path to the supplied Cinematique catalog.json.');
}

const sourceBytes = await readFile(path.resolve(inputPath));
const catalog = JSON.parse(sourceBytes.toString('utf8').replace(/^\uFEFF/, ''));
const expectedCategories = {
  'Camera Work': 41,
  Lighting: 30,
  Composition: 21,
  Editing: 17,
  Storytelling: 12,
  'Visual Effects & Promptable FX': 8,
  'Genres & Styles': 21,
};
const requiredTextFields = [
  'id', 'name', 'category', 'function', 'meaning', 'application', 'direction',
  'watch', 'complexity', 'priority', 'source', 'stage', 'text_review',
  'visual_review', 'motion_review', 'test_status', 'reviewed_date',
];

if (!catalog.metadata || catalog.metadata.entry_count !== 150 || catalog.techniques?.length !== 150) {
  throw new Error('Expected the complete 150-entry Cinematique source catalog.');
}

const ids = new Set();
const slugs = new Set();
const counts = {};
for (const [index, technique] of catalog.techniques.entries()) {
  for (const key of requiredTextFields) {
    if (typeof technique[key] !== 'string' || !technique[key].trim()) {
      throw new Error(`Entry ${index + 1} has a missing or invalid ${key}.`);
    }
  }
  if (technique.number !== index + 1 || technique.id !== `VVS-${String(index + 1).padStart(3, '0')}`) {
    throw new Error(`Unexpected reference ordering at entry ${index + 1}.`);
  }
  if (!['Low', 'Medium', 'High'].includes(technique.complexity)) {
    throw new Error(`Unknown complexity for ${technique.id}.`);
  }
  if (!['Core', 'Selective', 'Special-purpose'].includes(technique.priority)) {
    throw new Error(`Unknown priority for ${technique.id}.`);
  }
  const source = new URL(technique.source);
  if (source.origin !== 'https://vvsvs.pro' || !source.pathname.startsWith('/cinematique/')) {
    throw new Error(`Unexpected source URL for ${technique.id}.`);
  }
  const slug = source.pathname.split('/').filter(Boolean).at(-1);
  if (ids.has(technique.id) || slugs.has(slug)) {
    throw new Error(`Duplicate ID or source slug for ${technique.id}.`);
  }
  ids.add(technique.id);
  slugs.add(slug);
  counts[technique.category] = (counts[technique.category] || 0) + 1;
}

for (const [category, count] of Object.entries(expectedCategories)) {
  if (counts[category] !== count || catalog.metadata.category_counts[category] !== count) {
    throw new Error(`Unexpected count for ${category}.`);
  }
}
if (Object.keys(counts).length !== Object.keys(expectedCategories).length) {
  throw new Error('The catalog contains an unexpected category.');
}
if (!Array.isArray(catalog.recipes) || catalog.recipes.length !== 10) {
  throw new Error('Expected ten starter recipes.');
}
for (const recipe of catalog.recipes) {
  const references = recipe.technique_ids.split(/\s*\+\s*/);
  if (!references.length || references.some((id) => !ids.has(id))) {
    throw new Error(`Unknown technique reference in recipe ${recipe.id}.`);
  }
}
if (!Array.isArray(catalog.workflow) || !Array.isArray(catalog.guardrails)) {
  throw new Error('Missing workflow or comparison notes.');
}

const outputPath = fileURLToPath(new URL('../src/lib/camera-reference/catalog-data.ts', import.meta.url));
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
const output = [
  '// Generated from the user-supplied Cinematique_Library/catalog.json.',
  '// Source prose is reference content, never executable instructions.',
  '// Regenerate with scripts/import-camera-references.mjs; no external assets are fetched.',
  `export const catalogSourceSha256 = ${JSON.stringify(sourceSha256)};`,
  '',
  `export const sourceCatalog = ${JSON.stringify(catalog, null, 2)} as const;`,
  '',
].join('\n');

if (checkOnly) {
  const existing = await readFile(outputPath, 'utf8');
  if (existing !== output) throw new Error('The imported catalog differs from the supplied source.');
  console.log(`Verified all ${ids.size} references, 7 categories, 10 recipes, and source SHA-256 ${sourceSha256}.`);
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf8');
  console.log(`Imported ${ids.size} references into ${outputPath}.`);
}
