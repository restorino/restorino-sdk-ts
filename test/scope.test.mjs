/**
 * Storefront scope contract.
 *
 * This SDK is for the public storefront and the customer account only. These
 * tests fail if a module reaches outside that surface, if the guard can be
 * bypassed, or if a backoffice method is re-introduced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RestorinoClient,
  isStorefrontEndpoint,
  normalizeEndpointPath
} from '../dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESTAURANT_UUID = '9b2f5f2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

function client(overrides = {}) {
  return new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    restaurantId: RESTAURANT_UUID,
    storageType: 'memory',
    ...overrides
  });
}

// ─── Isolation: no module may reference a privileged path ────────────────────

test('Scope: every endpoint literal in src/ is inside the storefront surface', () => {
  const files = [
    ...fs.readdirSync(path.join(root, 'src/modules')).map((f) => `src/modules/${f}`),
    'src/client.ts'
  ];

  const violations = [];
  for (const relative of files) {
    const absolute = path.join(root, relative);
    if (!absolute.endsWith('.ts') || !fs.existsSync(absolute)) continue;

    const source = fs.readFileSync(absolute, 'utf8');
    const matches = source.match(/['"`]\/api\/[^'"`\s]+['"`]/g) ?? [];

    for (const literal of matches) {
      // Template placeholders are replaced by a neutral segment.
      const endpoint = literal.slice(1, -1).replace(/\$\{[^}]*\}/g, 'x');
      if (!isStorefrontEndpoint(endpoint)) {
        violations.push(`${relative}: ${endpoint}`);
      }
    }
  }

  assert.deepEqual(violations, [], 'modules reference endpoints outside the storefront scope');
});

test('Scope: backoffice and platform surfaces are denied', () => {
  const forbidden = [
    '/api/admin/users',
    '/api/admin/settings',
    '/api/pos/sessions',
    '/api/internal/tools',
    '/api/rag/query',
    '/api/analytics/revenue',
    '/api/driver/me',
    '/api/deliveries/admin/all',
    '/api/loyalty/customers/abc/points',
    '/api/support/tickets',
    '/api/vitrine/tenant-1/config',
    '/api/vitrine/templates',
    '/api/vitrine/api-keys/validate',
    '/api/auth/internal/login',
    '/api/customers-archive'
  ];

  for (const endpoint of forbidden) {
    assert.equal(isStorefrontEndpoint(endpoint), false, `should be denied: ${endpoint}`);
  }
});

test('Scope: public storefront and customer paths are allowed', () => {
  const allowed = [
    '/api/public/restaurants/search',
    '/api/public/restaurants/abc/orders',
    '/api/public/restaurants/abc/tables/def',
    '/api/public/deliveries/track/TRK-1',
    '/api/public/live-agent/bella-vita/session',
    '/api/auth/customers/login',
    '/api/auth/refresh',
    '/api/customers/me',
    '/api/customers/loyalty/rewards/r1/redeem',
    '/api/notifications/customers/my-inbox/unread-count',
    '/api/vitrine/tenant-1/public',
    '/api/vitrine/tenant-1/schema.json',
    '/api/vitrine/resolve-domain'
  ];

  for (const endpoint of allowed) {
    assert.equal(isStorefrontEndpoint(endpoint), true, `should be allowed: ${endpoint}`);
  }
});

test('Scope: traversal and encoded tricks cannot escape the allowlist', () => {
  assert.equal(normalizeEndpointPath('/api/public/../admin/users'), '/api/admin/users');
  assert.equal(normalizeEndpointPath('/api/customers/../../internal/tools'), '/internal/tools');

  const attempts = [
    '/api/public/../admin/users',
    '/api/customers/../../internal/tools',
    '/api/public/restaurants/..%2F..%2Fadmin',
    '//api/admin/users',
    '/api/public/./../../pos/sessions'
  ];

  for (const attempt of attempts) {
    assert.equal(isStorefrontEndpoint(attempt), false, `traversal not blocked: ${attempt}`);
  }
});

// ─── Enforcement: blocked before any network call ────────────────────────────

test('Scope: an out-of-scope call throws before fetch and never hits the network', async () => {
  const c = client();
  const original = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;
    return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) };
  };

  try {
    await assert.rejects(
      async () => c.http.request('/api/admin/users'),
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.error, 'OUT_OF_SCOPE_ENDPOINT');
        return true;
      }
    );

    assert.equal(calls, 0, 'the guard must run before fetch');
  } finally {
    globalThis.fetch = original;
  }
});

test('Scope: the removed backoffice methods are not part of the client', () => {
  const c = client();

  assert.equal(c.vitrine.getConfig, undefined, 'getConfig (RESTAURANT_ADMIN) must not exist');
  assert.equal(c.vitrine.getTemplates, undefined, 'getTemplates (builder) must not exist');
  assert.equal(c.vitrine.validateApiKey, undefined, 'validateApiKey (key mgmt) must not exist');
  assert.equal(c.getApiKey, undefined, 'getApiKey must not exist');
  assert.equal(c.setApiKey, undefined, 'setApiKey must not exist');
});

test("Scope: the escape hatch requires an explicit 'all' opt-in", () => {
  const guarded = client();
  const open = client({ scope: 'all' });

  assert.equal(guarded.http.getConfig().scope, 'storefront');
  assert.equal(open.http.getConfig().scope, 'all');
});

test('Scope: the perimeter cannot be widened after construction', () => {
  const guarded = client();
  guarded.configure({ scope: 'all' });

  assert.equal(guarded.http.getConfig().scope, 'storefront', 'scope must be construction-only');
});

test('Scope: no administrative role literal remains in sources or docs', () => {
  // Written as a pattern so the forbidden token does not itself appear here.
  const forbidden = /super[-_]?admin/i;
  const hits = [];

  const scan = (file) => {
    if (forbidden.test(fs.readFileSync(file, 'utf8'))) {
      hits.push(path.relative(root, file));
    }
  };

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|js|mjs)$/.test(entry.name)) scan(full);
    }
  };

  walk(path.join(root, 'src'));

  for (const doc of [
    'README.md',
    'LOVABLE_PROMPT.md',
    'LOVABLE_1SHOT_PROMPT.txt',
    'prompt.txt',
    'llms.txt',
    'CHANGELOG.md'
  ]) {
    scan(path.join(root, doc));
  }

  assert.deepEqual(hits, [], 'an administrative role literal is still present');
});
