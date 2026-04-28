#!/usr/bin/env node
/**
 * Convert WebM clips produced by Playwright into MP4 (H.264) ready for
 * upload to social platforms / editing in CapCut.
 *
 * Walks clips/output/webm/ recursively, mirrors structure into
 * clips/output/mp4/, skips files that are already up to date.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'output', 'webm');
const DST = join(ROOT, 'output', 'mp4');

function findWebms(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...findWebms(full));
    else if (entry.endsWith('.webm')) out.push(full);
  }
  return out;
}

function shouldRebuild(srcPath, dstPath) {
  try {
    return statSync(dstPath).mtimeMs < statSync(srcPath).mtimeMs;
  } catch {
    return true;
  }
}

function ensureFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (r.status !== 0) {
    console.error('ffmpeg not found on PATH. Install with: brew install ffmpeg');
    process.exit(1);
  }
}

ensureFfmpeg();

let webms;
try {
  webms = findWebms(SRC);
} catch {
  console.error(`No clips found at ${SRC}. Run \`npm run clips:record\` first.`);
  process.exit(1);
}

if (webms.length === 0) {
  console.error(`No .webm files in ${SRC}. Run \`npm run clips:record\` first.`);
  process.exit(1);
}

let converted = 0;
let skipped = 0;
for (const src of webms) {
  const rel = relative(SRC, src);
  const dst = join(DST, rel.replace(/\.webm$/, '.mp4'));
  if (!shouldRebuild(src, dst)) {
    skipped++;
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  console.log(`→ ${rel}`);
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-i', src, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', dst],
    { stdio: 'inherit' }
  );
  if (r.status !== 0) {
    console.error(`ffmpeg failed for ${rel}`);
    process.exit(r.status ?? 1);
  }
  converted++;
}

console.log(`\nConverted ${converted}, skipped ${skipped} (already up to date).`);
console.log(`Output: ${DST}`);
