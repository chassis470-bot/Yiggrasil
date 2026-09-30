#!/usr/bin/env node
/* Regenerates js/realms.data.js from data/realms.json.
   The UI cannot fetch the JSON when opened via file://, so the JSON is the
   source of truth and this file is the browser-safe mirror of it.
   Usage: node tools/build-realms.mjs   (fails loudly on duplicate ids) */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data', 'realms.json');
const out = join(root, 'js', 'realms.data.js');

const data = JSON.parse(readFileSync(src, 'utf8'));

if (!Array.isArray(data.realms) || !data.realms.length) {
  console.error('build-realms: data/realms.json has no realms');
  process.exit(1);
}

const seen = new Set();
for (const r of data.realms) {
  if (!r.id) { console.error('build-realms: realm missing id'); process.exit(1); }
  if (seen.has(r.id)) {
    console.error(`build-realms: duplicate realm id "${r.id}" — two cards would share one memory set`);
    process.exit(1);
  }
  seen.add(r.id);
}

const banner = `/* Generated from data/realms.json by tools/build-realms.mjs — do not edit by hand.
   Edit the JSON, then run: node tools/build-realms.mjs
   This exists because fetch/XHR is blocked on file:// — the UI must work by
   opening index.html directly, not only when served. */`;

writeFileSync(out, `${banner}\nwindow.YGGDRASIL_REALMS_DATA = ${JSON.stringify(data, null, 2)};\n`);

console.log(`build-realms: ${data.realms.length} realms -> js/realms.data.js`);
console.log(`  ${data.realms.map((r) => r.id).join(', ')}`);
