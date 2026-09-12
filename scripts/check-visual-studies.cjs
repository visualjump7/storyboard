// Integration QA of illustrative studies through the existing two password gates.
const { join } = require('node:path');
const { homedir } = require('node:os');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const runtime = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || join(runtime, 'playwright'));
const sharp = require(join(runtime, 'sharp'));
require('@next/env').loadEnvConfig(process.cwd());

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = process.env.CAMERA_QA_URL || 'http://localhost:3000';
  const output = '.next/visual-studies-qa';
  mkdirSync(output, { recursive: true });
  await page.goto(`${base}/camera-references`);
  await page.getByLabel('Password', { exact: true }).fill(process.env.STORYBOARD_PASSWORD.trim());
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/');
  await page.goto(`${base}/camera-references`);
  await page.getByLabel('Section password').fill(process.env.CAMERA_QA_PASSWORD);
  await page.getByRole('button', { name: 'Unlock camera references' }).click();
  await page.waitForURL(url => url.pathname === '/camera-references');
  await page.getByRole('button', { name: 'All references', exact: true }).click();
  const generated = readFileSync('src/lib/camera-reference/catalog-data.ts', 'utf8');
  const catalog = JSON.parse(generated.match(/export const sourceCatalog = ([\s\S]*) as const;/)[1]);
  const nonCamera = catalog.techniques.filter(x => x.category !== 'Camera Work');
  for (const r of nonCamera) {
    await page.getByRole('button', { name: `Explore ${r.name}`, exact: true }).click();
    const timeline = page.getByLabel('Study timeline');
    assert.equal(await timeline.isEnabled(), true, `${r.name}: supports playback`);
    await timeline.fill('0.75');
    const study = page.getByRole('region', { name: `${r.name} study`, exact: true });
    assert.ok(await study.getByRole('img').count(), `${r.name}: has a specific visual`);
  }
  for (const name of ['Color Grading', 'Desaturation', 'Sepia Tone', 'Rembrandt Lighting', 'Soft Light', 'Rack Focus', 'Two-Shot', 'Rule of Thirds', 'Dissolve', 'Wipe', 'Flashback', 'Film Noir', 'Cosmic Horror']) {
    await page.getByRole('button', { name: `Explore ${name}`, exact: true }).click();
    await page.getByLabel('Study timeline').fill('0.85');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${name.toLowerCase().replace(/[^a-z]+/g, '-')}.png` });
  }

  // Use a controlled colorful raster fixture to verify actual color math, not just labels.
  const fixture = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="330"><rect width="200" height="330" fill="#d94b34"/><rect x="200" width="200" height="330" fill="#4bba71"/><rect x="400" width="200" height="330" fill="#3c8bd4"/></svg>');
  await sharp(fixture).png().toFile(`${output}/color-fixture.png`);
  await page.getByRole('button', { name: 'Explore Desaturation', exact: true }).click();
  await page.getByLabel('Use your own reference image').setInputFiles(`${output}/color-fixture.png`);
  await page.getByRole('button', { name: 'Effect view', exact: true }).click();
  await page.getByLabel('Study timeline').fill('1');
  await page.waitForFunction(() => [...document.querySelectorAll('svg image')].some(el => el.getAttribute('href')?.startsWith('blob:')));
  const selected = page.getByRole('region', { name: 'Desaturation study', exact: true }).getByRole('img').first();
  const buffer = await selected.screenshot();
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Math.floor(info.width / 3), py = Math.floor(info.height / 2);
  const offset = (py * info.width + px) * info.channels;
  const values = [...data.slice(offset, offset + 3)];
  assert.ok(Math.max(...values) - Math.min(...values) <= 4, `Full desaturation is neutral: ${values}`);
  writeFileSync(`${output}/own-image-desaturated.png`, buffer);
  await page.getByRole('button', { name: 'Reset reference image', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/mobile-effect.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(`PASS: all ${nonCamera.length} non-camera studies, representative camera composition studies, user-image filtering with pixel validation, mobile width, and no runtime errors.`);
  console.log(`Visual QA screenshots: ${output}`);
  await browser.close();
})().catch(error => { console.error(error.stack); process.exit(1); });
