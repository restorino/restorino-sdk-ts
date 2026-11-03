/**
 * Packaging contract: every entry point declared in package.json must exist and
 * load. `module` used to point at a file tsc never produced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Packaging: declared entry points exist on disk', () => {
  const declared = new Set([
    pkg.main,
    pkg.module,
    pkg.types,
    ...Object.values(pkg.exports['.'])
  ]);

  for (const entry of declared) {
    assert.ok(entry, 'package.json declares an empty entry point');
    const absolute = path.join(root, entry);
    assert.ok(fs.existsSync(absolute), `declared entry point is missing: ${entry}`);
  }
});

test('Packaging: ESM entry loads and exposes the client', async () => {
  const esm = await import(new URL('../dist/esm/index.js', import.meta.url).href);

  assert.equal(typeof esm.RestorinoClient, 'function');
  assert.equal(typeof esm.RestorinoApiError, 'function');
  assert.equal(typeof esm.createPcmPlayer, 'function');
  assert.equal(typeof esm.calculateCart, 'function');
});

test('Packaging: CJS entry loads and exposes the client', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const cjs = require('../dist/index.js');

  assert.equal(typeof cjs.RestorinoClient, 'function');
  assert.equal(typeof cjs.createPcmPlayer, 'function');
});

test('Packaging: ESM output uses explicit relative extensions', () => {
  const esmIndex = fs.readFileSync(path.join(root, 'dist/esm/index.js'), 'utf8');
  const extensionless = [...esmIndex.matchAll(/from\s+['"](\.[^'"]*)['"]/g)]
    .map((match) => match[1])
    .filter((specifier) => !/\.(js|mjs|json)$/.test(specifier));

  assert.deepEqual(extensionless, [], 'Node ESM requires .js extensions');
});

test('Packaging: error identity holds across the CJS and ESM builds', async () => {
  const esm = await import(new URL('../dist/esm/index.js', import.meta.url).href);
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const cjs = require('../dist/index.js');

  // Two entry points necessarily produce two class objects...
  assert.notEqual(cjs.RestorinoApiError, esm.RestorinoApiError);

  // ...but `instanceof` must still work in both directions, otherwise a
  // consumer's error switch silently falls through to `default`.
  const fromCjs = new cjs.RestorinoApiError(404, 'not found', 'NOT_FOUND');
  const fromEsm = new esm.RestorinoApiError(409, 'conflict', 'CONFLICT');

  assert.ok(fromCjs instanceof esm.RestorinoApiError);
  assert.ok(fromEsm instanceof cjs.RestorinoApiError);
  assert.ok(fromCjs instanceof cjs.RestorinoApiError);
  assert.ok(fromCjs instanceof Error);

  // The brand is a symbol, so an object that merely mimics the name is rejected.
  assert.equal({ name: 'RestorinoApiError' } instanceof cjs.RestorinoApiError, false);
});

test('Packaging: the PCM player is a safe no-op without Web Audio', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { createPcmPlayer } = require('../dist/index.js');

  const player = createPcmPlayer();
  assert.equal(typeof player.close, 'function');

  player.enqueue(new Uint8Array([0, 0, 1, 0]));
  player.updateSampleRate(16000);
  assert.equal(player.sampleRate, 16000);
  assert.equal(player.playing, false);

  player.stop();
  player.close();
});

test('Packaging: the single-file bundle contains every module', () => {
  const bundle = fs.readFileSync(path.join(root, 'dist-bundle/restorino-sdk.ts'), 'utf8');

  for (const symbol of [
    'class RestorinoClient',
    'class HttpClient',
    'class AuthModule',
    'class OrdersModule',
    'class VitrineModule',
    'class LoyaltyModule',
    'class LiveAgentModule',
    'function createPcmPlayer',
    'function calculateCart'
  ]) {
    assert.ok(bundle.includes(symbol), `bundle is missing ${symbol}`);
  }

  const leftoverImports = [...bundle.matchAll(/^\s*import\s+.*from\s+['"]\.[^'"]+['"]/gm)];
  assert.equal(leftoverImports.length, 0, 'bundle still contains relative imports');
});
