#!/usr/bin/env node
/* Headless self-test for the memory model. Runs the real js/memory.js under a
   minimal DOM shim — no test framework, no dependencies.
   Usage: node tools/selftest.mjs */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* minimal browser surface memory.js touches */
const store = new Map();
const sandbox = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(root, 'js', 'memory.js'), 'utf8'), sandbox);

const { Tree } = sandbox.Yggdrasil;

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}

/* --- remember / dedupe --- */
console.log('\nbindings');
const t = new Tree();
t.remember('alfa', 'is', 'one', 'asgard', 'd1');
t.remember('beta', 'is', 'two', 'midgard');
t.remember('gamma', 'is', 'three', 'helheim');
ok('three bindings stored', t.stats().total === 3);
ok('byRealm partitions correctly',
   t.byRealm('asgard').length === 1 && t.byRealm('helheim').length === 1);

const again = t.remember('alfa', 'is', 'one', 'asgard', 'd2');
ok('re-remember is idempotent (no duplicate)', t.stats().total === 3);
ok('re-remember updates deep text', again.deep === 'd2');

/* --- recall strengthens --- */
console.log('\nrecall');
const before = again.strength;
t.recall(again.id);
ok('recall increases strength', again.strength > before);
ok('recall counts', again.recalls === 1);

/* --- promotion: repeated recall lifts midgard -> asgard --- */
console.log('\nconsolidation');
const m = t.remember('delta', 'is', 'working', 'midgard');
for (let i = 0; i < 4; i++) t.recall(m.id);
ok('well-recalled working memory ascends to asgard', m.realm === 'asgard');
ok('ascension backfills deep text', typeof m.deep === 'string' && m.deep.length > 0);
ok('strength is capped at 1', m.strength <= 1);

/* --- persistence round-trip --- */
console.log('\npersistence');
const t2 = new Tree();
t2.remember('epsilon', 'is', 'persisted', 'helheim', 'kept');
ok('save returns true', t2.save() === true);

const t3 = new Tree().restore();
ok('restore recovers binding count', t3.stats().total === 1);
const back = t3.byRealm('helheim')[0];
ok('restore preserves subject/predicate/object',
   back && back.subject === 'epsilon' && back.predicate === 'is' && back.object === 'persisted');
ok('restore preserves deep text', back && back.deep === 'kept');

/* --- corrupt storage must not throw --- */
console.log('\nresilience');
store.set('yggdrasil.tree', '{not json');
let threw = false;
try { new Tree().restore(); } catch { threw = true; }
ok('corrupt localStorage does not throw', !threw);

/* --- realms.json integrity --- */
console.log('\nrealm data');
const realms = JSON.parse(readFileSync(join(root, 'data', 'realms.json'), 'utf8')).realms;
const ids = realms.map((r) => r.id);
ok('realm ids are unique', new Set(ids).size === ids.length);
ok('generated bundle is in sync with json',
   readFileSync(join(root, 'js', 'realms.data.js'), 'utf8').includes('"' + ids[0] + '"'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
