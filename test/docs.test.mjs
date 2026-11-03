/**
 * Documentation contract tests.
 *
 * An agent builds from these docs, so a wrong method name here is a wrong line
 * of generated code. These tests fail the build the moment the docs drift from
 * the shipped API surface.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RestorinoClient } from '../dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guide = fs.readFileSync(path.join(root, 'LOVABLE_PROMPT.md'), 'utf8');
const prompt = fs.readFileSync(path.join(root, 'prompt.txt'), 'utf8');
const oneShot = fs.readFileSync(path.join(root, 'LOVABLE_1SHOT_PROMPT.txt'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const client = new RestorinoClient({
  baseUrl: 'https://api.restorino.com',
  storageType: 'memory'
});

/** Public method names declared in a `.d.ts` (4-space indented, no `private`). */
function declaredMethods(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const names = new Set();
  const re = /^ {4}([a-zA-Z_]+)(?:<[^>]*>)?\(/gm;
  let match;
  while ((match = re.exec(source))) {
    if (match[1] !== 'constructor') names.add(match[1]);
  }
  return names;
}

test('Docs: every documented api.<module>.<method>() exists on the client', () => {
  const missing = [];

  for (const [name, content] of [
    ['LOVABLE_PROMPT.md', guide],
    ['prompt.txt', prompt],
    ['LOVABLE_1SHOT_PROMPT.txt', oneShot],
    ['README.md', readme]
  ]) {
    const re = /\bapi\.([a-zA-Z]+)\.([a-zA-Z_]+)\s*\(/g;
    let match;
    while ((match = re.exec(content))) {
      const [, moduleName, methodName] = match;
      const target = client[moduleName];
      if (!target || typeof target[methodName] !== 'function') {
        missing.push(`${name}: api.${moduleName}.${methodName}()`);
      }
    }
  }

  assert.deepEqual([...new Set(missing)], [], 'docs reference methods that do not exist');
});

test('Docs: every public SDK method is documented in the build guide', () => {
  const declared = new Set();
  for (const relativePath of fs.readdirSync(path.join(root, 'dist/modules'))) {
    if (relativePath.endsWith('.d.ts')) {
      for (const name of declaredMethods(`dist/modules/${relativePath}`)) declared.add(name);
    }
  }
  for (const name of declaredMethods('dist/client.d.ts')) declared.add(name);

  const undocumented = [...declared].filter((name) => {
    const re = new RegExp(`\\b${name}\\s*\\(`);
    return !re.test(guide);
  });

  assert.deepEqual(undocumented, [], 'public methods missing from LOVABLE_PROMPT.md');
});

test('Docs: one-shot prompt and its duplicate stay identical', () => {
  assert.equal(oneShot, prompt, 'prompt.txt and LOVABLE_1SHOT_PROMPT.txt must match');
});

test('Docs: the guide forbids every legacy field name that used to break the API', () => {
  const traps = [
    'deliveryMethod',
    'paymentMethod',
    'totalPrice',
    'deliveryStatus',
    'pointsRequired',
    'overallRating',
    'restaurantId',
    'numberOfGuests',
    'resetCode'
  ];

  for (const trap of traps) {
    assert.ok(guide.includes(trap), `guide must mention ${trap}`);
  }
});
