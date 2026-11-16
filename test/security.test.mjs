/**
 * Security invariants for the SDK.
 *
 * Each test pins a property that, if regressed, turns a client bug into a
 * credential leak, a session-fixation issue or a denial of service.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RestorinoClient, RestorinoApiError } from '../dist/index.js';

const RESTAURANT_UUID = '9b2f5f2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body, status = 200, contentType = 'application/json') => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  headers: new Headers({ 'content-type': contentType }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

function client(overrides = {}) {
  return new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    restaurantId: RESTAURANT_UUID,
    storageType: 'memory',
    ...overrides
  });
}

// ─── baseUrl validation ──────────────────────────────────────────────────────

test('Security: baseUrl rejects non-http(s) schemes', () => {
  for (const baseUrl of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) {
    assert.throws(() => client({ baseUrl }), /protocole http\(s\)/, `accepted ${baseUrl}`);
  }
});

test('Security: baseUrl rejects protocol-relative and credential-bearing URLs', () => {
  assert.throws(() => client({ baseUrl: '//evil.example.com' }), /protocol-relative/);
  assert.throws(() => client({ baseUrl: 'https://user:secret@api.restorino.com' }), /identifiants/);
});

test('Security: baseUrl rejects query parameters and fragments', () => {
  assert.throws(() => client({ baseUrl: 'https://api.restorino.com?env=staging' }), /paramètres de requête/);
  assert.throws(() => client({ baseUrl: 'https://api.restorino.com#target' }), /paramètres de requête/);
});

test('Security: baseUrl accepts https and same-origin relative paths', () => {
  assert.equal(client({ baseUrl: 'https://api.restorino.com/' }).http.getConfig().baseUrl, 'https://api.restorino.com');
  assert.equal(client({ baseUrl: '/api' }).http.getConfig().baseUrl, '/api');
  assert.equal(client({ baseUrl: '' }).http.getConfig().baseUrl, '');
});

test('Security: updateConfig re-validates baseUrl', () => {
  const c = client();
  assert.throws(() => c.configure({ baseUrl: 'javascript:alert(1)' }), /protocole http\(s\)/);
});

test('Security: getConfig returns a copy, not the live config object', () => {
  const c = client();
  const snapshot = c.http.getConfig();
  snapshot.baseUrl = 'https://evil.example.com';
  snapshot.restaurantId = 'injected';

  assert.equal(c.http.getConfig().baseUrl, 'https://api.restorino.com');
  assert.equal(c.http.getConfig().restaurantId, RESTAURANT_UUID);
});

// ─── Token storage ───────────────────────────────────────────────────────────

test('Security: tokens are never written to localStorage by default', () => {
  const writes = [];
  globalThis.window = {};
  globalThis.localStorage = {
    setItem: (k, v) => writes.push([k, v]),
    getItem: () => null,
    removeItem: (k) => writes.push([k, null])
  };
  globalThis.sessionStorage = { ...globalThis.localStorage };

  try {
    const c = client({ storageType: undefined });
    c.http.setAuthTokens('access-token', 'refresh-token');

    assert.deepEqual(writes, [], 'default storage must be memory-only');
    assert.equal(c.http.getToken(), 'access-token', 'token still usable in memory');
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});

test('Security: browser storage is only used on explicit opt-in', () => {
  const writes = [];
  globalThis.window = {};
  globalThis.localStorage = {
    setItem: (k, v) => writes.push([k, v]),
    getItem: () => null,
    removeItem: (k) => writes.push([k, null])
  };

  try {
    const c = client({ storageType: 'localStorage' });
    c.http.setAuthTokens('access-token', 'refresh-token');
    assert.equal(writes.length, 2);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

test('Security: poisoned stored tokens are rejected on load', () => {
  const poisoned = 'abc\r\nX-Injected: 1';
  globalThis.window = {};
  globalThis.localStorage = {
    setItem: () => {},
    getItem: () => poisoned,
    removeItem: () => {}
  };

  try {
    const c = client({ storageType: 'localStorage' });
    assert.equal(c.http.getToken(), null);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

// ─── Credential handling ─────────────────────────────────────────────────────

test('Security: the Vitrine API key is never sent unless explicitly opted in', async () => {
  const c = client({ apiKey: 'vit_live_secret' });
  const original = globalThis.fetch;
  let headers = null;

  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return jsonResponse({});
  };

  try {
    await c.vitrine.getPopular();
    assert.equal(headers['X-API-Key'], undefined);
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: Authorization header cannot be CRLF-injected', async () => {
  const c = client();
  c.http.setToken('token\r\nX-Evil: 1');
  const original = globalThis.fetch;
  let headers = null;

  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return jsonResponse({});
  };

  try {
    await c.vitrine.getPopular();
    assert.equal(headers['Authorization'], 'Bearer tokenX-Evil: 1');
    assert.equal(headers['X-Evil'], undefined);
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: logout during an in-flight refresh cannot re-authenticate the client', async () => {
  const c = client();
  c.http.setAuthTokens('old-access', 'refresh-1');

  const original = globalThis.fetch;
  let refreshStarted = false;

  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/auth/refresh')) {
      refreshStarted = true;
      await sleep(60);
      return jsonResponse({ token: 'resurrected-token', success: true });
    }
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  };

  try {
    const pending = c.http.request('/api/customers/me', { requiresAuth: true }).catch((e) => e);

    await sleep(20);
    assert.equal(refreshStarted, true, 'refresh should have started');

    c.http.clearTokens();
    await pending;

    assert.equal(c.http.getToken(), null, 'a completed logout must win the race');
    assert.equal(c.http.getRefreshToken(), null);
  } finally {
    globalThis.fetch = original;
  }
});

// ─── Response handling ───────────────────────────────────────────────────────

test('Security: a non-JSON 2xx response is rejected instead of typed as success', async () => {
  const c = client();
  const original = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/html' }),
    text: async () => '<html>captive portal</html>'
  });

  try {
    await assert.rejects(
      async () => c.vitrine.getPopular(),
      (err) => err instanceof RestorinoApiError && err.error === 'INVALID_RESPONSE'
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: oversized error payloads are bounded in the thrown error', async () => {
  const c = client();
  const original = globalThis.fetch;

  globalThis.fetch = async () => jsonResponse(
    { error: 'VALIDATION', message: 'bad request', padding: 'a'.repeat(20000) },
    400
  );

  try {
    await assert.rejects(
      async () => c.vitrine.getPopular(),
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.message, 'bad request');
        assert.ok(JSON.stringify(err.raw).length < 9000, 'raw payload must be capped');
        return true;
      }
    );
  } finally {
    globalThis.fetch = original;
  }
});

// ─── Resource exhaustion ─────────────────────────────────────────────────────

test('Security: watchOrder gives up after the configured consecutive error budget', async () => {
  const c = client();
  const original = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;
    return jsonResponse({ error: 'SERVER_ERROR' }, 500);
  };

  try {
    let errors = 0;
    const stop = c.orders.watchOrder(
      'ord-1',
      { customerEmail: 'a@b.co', customerPhone: '0600000000' },
      () => {},
      { intervalMs: 10, maxConsecutiveErrors: 2, onError: () => { errors++; } }
    );

    await sleep(200);
    stop();

    assert.equal(errors, 2);
    assert.equal(calls, 2, 'polling must stop after the error budget');
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: watchOrder respects the maximum surveillance duration', async () => {
  const c = client();
  const original = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;
    return jsonResponse({ orderId: 'ord-1', status: 'PREPARING' });
  };

  try {
    const stop = c.orders.watchOrder(
      'ord-1',
      { customerEmail: 'a@b.co', customerPhone: '0600000000' },
      () => {},
      { intervalMs: 10, maxDurationMs: 40 }
    );

    await sleep(250);
    stop();

    assert.ok(calls >= 1);
    assert.ok(calls <= 6, `expected a bounded number of polls, got ${calls}`);
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: sharing one AbortSignal across requests does not leak listeners', async () => {
  const c = client();
  const original = globalThis.fetch;
  const controller = new AbortController();
  let registered = 0;
  let removed = 0;

  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = (...args) => { registered++; return add(...args); };
  controller.signal.removeEventListener = (...args) => { removed++; return remove(...args); };

  globalThis.fetch = async () => jsonResponse({});

  try {
    for (let i = 0; i < 5; i++) {
      await c.http.request('/api/public/restaurants/cuisines', { signal: controller.signal });
    }

    assert.equal(registered, 5);
    assert.equal(removed, 5, 'every listener must be removed once the request settles');
  } finally {
    globalThis.fetch = original;
  }
});

// ─── Transport hardening ─────────────────────────────────────────────────────

test('Security: plaintext http baseUrl is refused outside the local network', () => {
  assert.throws(() => client({ baseUrl: 'http://api.restorino.com' }), /réseau local/);

  // Loopback et LAN restent utilisables (dev, terminal POS local).
  for (const baseUrl of ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://192.168.1.20:8080']) {
    assert.equal(client({ baseUrl }).http.getConfig().baseUrl, baseUrl, `rejected ${baseUrl}`);
  }
});

test('Security: value-bearing loyalty mutations send an Idempotency-Key', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), key: options.headers['Idempotency-Key'] });
    return jsonResponse({ id: 'r1', name: 'Free coffee', availablePoints: 10 });
  };

  try {
    const c = client();
    await c.loyalty.redeemReward('11111111-1111-4111-8111-111111111111');
    await c.loyalty.claimGoogleReview({ reviewerName: 'Ada', rating: 5, reviewComment: 'ok' });

    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.ok(call.key && call.key.length >= 16, `missing Idempotency-Key on ${call.url}`);
    }
    assert.notEqual(calls[0].key, calls[1].key, 'each call must get its own key');
  } finally {
    globalThis.fetch = original;
  }
});

test('Security: an app-supplied idempotency key is preserved', async () => {
  const original = globalThis.fetch;
  let seenKey = null;
  globalThis.fetch = async (url, options) => {
    seenKey = options.headers['Idempotency-Key'];
    return jsonResponse({ id: 'r1', name: 'Free coffee', availablePoints: 10 });
  };

  try {
    const c = client();
    await c.loyalty.redeemReward('11111111-1111-4111-8111-111111111111', 'app-supplied-key-1234');
    assert.equal(seenKey, 'app-supplied-key-1234');
  } finally {
    globalThis.fetch = original;
  }
});
