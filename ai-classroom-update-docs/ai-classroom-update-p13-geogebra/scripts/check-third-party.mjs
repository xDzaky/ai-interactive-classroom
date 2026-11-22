#!/usr/bin/env node
// scripts/check-third-party.mjs
// Fails (exit 1) when GeoGebra code, identifiers or assets leak into apps/, packages/ or scripts/.
// Mentions are allowed only in docs/ (not scanned) and in the allowlisted embed spike folder.
// Run: node scripts/check-third-party.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';

const ROOTS = ['apps', 'packages', 'scripts'];
const SKIP_DIRS = new Set([
  'node_modules', 'vendor', 'dist', 'build', '.venv', '__pycache__', 'storage', 'coverage', '.git',
]);
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.php', '.py', '.css', '.scss', '.json', '.html', '.svg', '.java',
]);
const ALLOW = ['apps/web/src/features/ggb-embed/', 'scripts/check-third-party.mjs'];
const PATTERN = /geogebra|himamis|deployggb|\bEUPL\b/i;
const MAX_BYTES = 2_000_000;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const norm = (p) => p.split(sep).join('/');
const violations = [];

for (const root of ROOTS) {
  try {
    statSync(root);
  } catch {
    continue; // folder does not exist yet
  }
  for (const file of walk(root)) {
    const rel = norm(relative('.', file));
    if (ALLOW.some((a) => rel.startsWith(a))) continue;
    if (/geogebra|\.ggb$/i.test(rel)) {
      violations.push(`${rel}: file name mentions GeoGebra / is a .ggb file`);
      continue;
    }
    if (!TEXT_EXT.has(extname(file).toLowerCase())) continue;
    if (statSync(file).size > MAX_BYTES) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (PATTERN.test(line)) violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
}

if (violations.length > 0) {
  console.error('THIRD-PARTY GUARD FAILED — GeoGebra material found outside the allowlist:');
  for (const v of violations) console.error('  ' + v);
  console.error('\nSee docs/THIRD-PARTY-POLICY.md. Do not copy GeoGebra code, icons, strings or files.');
  process.exit(1);
}
console.log('third-party guard: OK');
